pragma solidity ^0.4.18;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';


contract EWillPlatform is Ownable {
    // Custom Types
    enum WillState { None, Created, Activated, Pending, Claimed, Declined }

    struct Will {
        uint256     willId;
        uint256     storageId;
        uint256     balance;
        uint256     annualFee;
        uint256     beneficiaryHash;
        uint256     decryptionKey;
        address     owner;
        WillState   state;
        uint256     createdAt;
        uint256     updatedAt;
        uint256     validTill;
        address     provider;
    }

    // Events
    event WillCreated(uint256 willId, address owner, address provider);
    event WillStateUpdated(uint256 willId, address owner, WillState newState);
    event WillRefreshed(uint256 willId, address owner);
    event WillProlonged(uint256 willId, address owner, uint validTill);
    event BalanceWithdrawn(address provider, uint256 amount);

    // State Variables
    string public name = 'E-Will Platform';

    uint256 public annualPlatformFee; // annual platform fee in weis
    mapping (address => uint256) public annualProviderFee;   // annual provider fee in weis

    uint256 public platformFund;      // platform's balance in wei
    mapping (address => uint256) public providerBalance;     // provider's balance in wei

    mapping (uint256 => Will) public wills;
    mapping (address => uint256[]) public userWills;
    mapping (uint256 => uint256[]) public beneficiaryWills;

    // Modifiers
    modifier onlyWillOwner(uint256 willId) {
        Will storage will = wills[willId];
        require(will.owner == msg.sender);
        _;
    }

    modifier onlyProvider(uint256 willId) {
        Will storage will = wills[willId];
        require(will.provider == msg.sender);
        _;
    }

    modifier sufficientAmount(uint256 _annualFee) {
        require(msg.value >= annualPlatformFee + _annualFee * 12 / 10);
        _;
    }

    // Constructor
    function EWillPlatform(uint256 _annualFee) public {
        annualPlatformFee = _annualFee;
    }

    // Configuration
    function setAnnaulPlatformFee(uint256 _fee) onlyOwner public {
        annualPlatformFee = _fee;
    }

    function setAnnaulProviderFee(uint256 _fee) public {
        annualProviderFee[msg.sender] = _fee;
    }

    // Will
    function createWill(uint256 _willId, uint256 _storageId, uint256 _beneficiaryHash, address _provider) sufficientAmount(annualProviderFee[_provider]) payable public {
        require(wills[_willId].state == WillState.None);
        require(address(_willId >> 96) == _provider);

        uint256 balance = msg.value - annualPlatformFee;
        platformFund += annualPlatformFee;

        wills[_willId] = Will({
            willId: _willId,
            storageId: _storageId,
            balance: balance,
            annualFee: annualProviderFee[_provider],
            owner: msg.sender,
            state: WillState.Created,
            beneficiaryHash: _beneficiaryHash,
            decryptionKey: 0,
            createdAt: now,
            updatedAt: now,
            validTill: 0,
            provider: _provider
        });
        userWills[msg.sender].push(_willId);

        WillCreated(_willId, msg.sender, _provider);
        WillStateUpdated(_willId, msg.sender, WillState.Created);
    }

    function activateWill(uint256 _willId) onlyProvider(_willId) public {
        Will storage will = wills[_willId];
        require(will.state == WillState.Created);

        will.state = WillState.Activated;
        will.updatedAt = now;
        will.validTill = now + 1 years;

        uint256 initialFee = will.annualFee / 10;
        will.balance -= initialFee;
        providerBalance[msg.sender] += initialFee;

        WillStateUpdated(will.willId, will.owner, will.state);
    }

    function refreshWill(uint256 _willId) onlyProvider(_willId) public {
        Will storage will = wills[_willId];
        require(will.state == WillState.Activated);

        uint256 monthlyFee = will.annualFee / 12; //todo: make a custom time period
        will.balance -= monthlyFee;
        providerBalance[msg.sender] += monthlyFee;

        WillRefreshed(will.willId, will.owner);
    }

    function prolongWill(uint256 _willId) sufficientAmount(wills[_willId].annualFee) payable public {
        Will storage will = wills[_willId];
        require(will.state == WillState.Activated);

        uint256 balance = msg.value - annualPlatformFee;
        platformFund += annualPlatformFee;

        will.validTill += 1 years;
        will.balance += balance;

        WillProlonged(will.willId, will.owner, will.validTill);
    }

    function applyWill(uint256 _willId, uint256 _decryptionKey) onlyProvider(_willId) public {
        Will storage will = wills[_willId];
        require(will.state == WillState.Activated);

        will.decryptionKey = _decryptionKey;
        will.state = WillState.Pending;
        will.updatedAt = now;
        beneficiaryWills[will.beneficiaryHash].push(_willId);

        WillStateUpdated(will.willId, will.owner, will.state);
    }

    function claimWill(uint256 _willId) public {
        Will storage will = wills[_willId];
        require(will.state == WillState.Pending);
        require(uint256(keccak256(msg.sender)) == will.beneficiaryHash);

        will.state = WillState.Claimed;
        will.updatedAt = now;

        WillStateUpdated(will.willId, will.owner, will.state);
    }

    function declineWill(uint256 _willId) onlyProvider(_willId) public {
        Will storage will = wills[_willId];
        require(will.state == WillState.Activated);
        require(will.validTill < now);

        will.state = WillState.Declined;
        will.updatedAt = now;

        WillStateUpdated(will.willId, will.owner, will.state);
    }

    function withdraw(uint256 _amount) public {
        require(_amount <= providerBalance[msg.sender]);

        providerBalance[msg.sender] -= _amount;
        msg.sender.transfer(_amount);

        BalanceWithdrawn(msg.sender, _amount);
    }
}
