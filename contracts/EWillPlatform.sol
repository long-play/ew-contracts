pragma solidity ^0.4.18;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/token/SafeERC20.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import './EWillAccountIf.sol';
import './EWillEscrowIf.sol';
import './EWillTokenIf.sol';


contract EWillPlatform is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for EWillTokenIf;

    // Custom Types
    enum WillState { None, Created, Activated, Pending, Claimed, Declined }

    struct Will {
        uint256     willId;
        uint256     storageId;
        uint256     annualFee;
        uint256     newFee;
        uint256     beneficiaryHash;
        uint256     decryptionKey;
        address     owner;
        WillState   state;
        uint256     createdAt;
        uint256     updatedAt;
        uint256     validTill;
        address     provider;
    }

    // Constants
    string constant public name = 'E-Will Platform';

    // State Variables
    uint256 public annualPlatformFee;                       // annual platform fee in dollars
    mapping (address => uint256) public annualProviderFee;  // annual provider fee in dollars
    uint256 public rateEther;                               // exchange rate, weis per dollar
    uint256 public rateToken;                               // exchange rate, tokenweis per dollar

    mapping (uint256 => Will) public wills;
    mapping (address => uint256[]) public userWills;
    mapping (uint256 => uint256[]) public beneficiaryWills;

    EWillAccountIf public accountWallet;
    EWillEscrowIf public escrowWallet;
    EWillTokenIf public token;

    // Events
    event WillCreated(uint256 willId, address owner, address provider);
    event WillStateUpdated(uint256 willId, address owner, WillState newState);
    event WillRefreshed(uint256 willId, address owner);
    event WillProlonged(uint256 willId, address owner, uint256 validTill);
    event WillAnnualFeeDecreased(uint256 willId, uint256 newAnnualFee);

    // Modifiers
    modifier onlyWillOwner(uint256 _willId) {
        Will storage will = wills[_willId];
        require(will.owner == msg.sender);
        _;
    }

    modifier onlyProvider(uint256 _willId) {
        Will storage will = wills[_willId];
        address provider = escrowWallet.providerAddress(msg.sender);
        require(/*todo: remove provider, the delegate only*/will.provider == msg.sender || will.provider == provider);
        _;
    }

    // Constructor
    function EWillPlatform(uint256 _annualFee, address _account, address _escrow, address _token) public {
        annualPlatformFee = _annualFee;
        accountWallet = EWillAccountIf(_account);
        escrowWallet = EWillEscrowIf(_escrow);
        token = EWillTokenIf(_token);
    }

    // Configuration
    function setAnnaulPlatformFee(uint256 _fee) public onlyOwner {
        annualPlatformFee = _fee;
    }

    function setAnnaulProviderFee(uint256 _fee) public {
        annualProviderFee[msg.sender] = _fee;
    }

    // Finance calculations
    function creatingFee(address _provider) public constant returns (uint256) {
        return annualProviderFee[_provider] * 12 / 10 + annualPlatformFee;
    }

    function annualFee(uint256 _willId) public constant returns (uint256) {
        return annualFee(wills[_willId]);
    }

    function annualFee(Will _will) private constant returns (uint256) {
        return annualProviderFee[_will.provider] + annualPlatformFee;
    }

    function activationReward(Will _will) private pure returns (uint256) {
        return _will.annualFee / 10;
    }

    function refreshReward(Will _will) private pure returns (uint256) {
        return _will.annualFee / 12;
    }

    function claimReward(Will _will) private pure returns (uint256) {
        return _will.annualFee / 10;
    }

    // Finance operations
    function exchangeTokens(uint256 _amount) public {
        //todo: charge the tokens and return ethers with 1% fee
    }

    // Internal Will
    function createWill(uint256 _willId, uint256 _storageId, uint256 _beneficiaryHash, address _provider) internal {
        require(escrowWallet.isProviderValid(_provider));
        require(wills[_willId].state == WillState.None);
        require(address(_willId >> 96) == _provider);

        // transfer commission to the account wallet
        token.safeTransfer(accountWallet, annualPlatformFee.mul(rateToken));
        accountWallet.fund(_willId);

        // create the will
        wills[_willId] = Will({
            willId: _willId,
            storageId: _storageId,
            annualFee: annualProviderFee[_provider].mul(rateToken),
            newFee: 0,
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

        // emit events
        WillCreated(_willId, msg.sender, _provider);
        WillStateUpdated(_willId, msg.sender, WillState.Created);
    }

    function prolongWill(uint256 _willId) internal {
        Will storage will = wills[_willId];
        require(will.state == WillState.Activated);
        require(will.validTill > now + 30 days);

        // transfer commission to the account wallet
        token.safeTransfer(accountWallet, annualPlatformFee.mul(rateToken));
        accountWallet.fund(_willId);

        // update the will
        will.newFee = annualProviderFee[will.provider].mul(rateToken);
        will.validTill += 1 years;

        // emit an event
        WillProlonged(_willId, will.owner, will.validTill);
    }

    // Public Will
    function numberOfUserWills(address _user) public view returns(uint256) {
        return userWills[_user].length;
    }

    function numberOfBeneficiaryWills(address _beneficiary) public view returns(uint256) {
        return beneficiaryWills[uint256(keccak256(_beneficiary))].length;
    }

    function createWillWithTokens(uint256 _willId, uint256 _storageId, uint256 _beneficiaryHash, address _provider) public {
        uint256 fee = creatingFee(_provider).mul(rateToken);
        require(fee <= token.balanceOf(msg.sender));

        token.charge(msg.sender, fee, bytes32(_willId));
        createWill(_willId, _storageId, _beneficiaryHash, _provider);
    }

    function createWillWithEther(uint256 _willId, uint256 _storageId, uint256 _beneficiaryHash, address _provider) public payable {
        uint256 fee = creatingFee(_provider).mul(rateEther);
        require(fee <= msg.value);

        uint256 change = msg.value.sub(fee);
        if (change > 0) {
            msg.sender.transfer(change);
        }

        createWill(_willId, _storageId, _beneficiaryHash, _provider);
    }

    function activateWill(uint256 _willId) public onlyProvider(_willId) {
        Will storage will = wills[_willId];
        require(will.state == WillState.Created);

        will.state = WillState.Activated;
        will.updatedAt = now;
        will.validTill = now + 1 years;

        token.safeTransfer(will.provider, activationReward(will));
        escrowWallet.fund(_willId, will.provider, activationReward(will));

        WillStateUpdated(_willId, will.owner, will.state);
    }

    function refreshWill(uint256 _willId) public onlyProvider(_willId) {
        Will storage will = wills[_willId];
        require(will.state == WillState.Activated);
        //todo: how to calc over the year
        require(will.updatedAt + 30 days < now);

        will.updatedAt = now;

        if (will.newFee > 0) {
            will.annualFee = will.newFee;
            will.newFee = 0;
        }

        token.safeTransfer(will.provider, refreshReward(will));
        escrowWallet.fund(_willId, will.provider, refreshReward(will));

        WillRefreshed(_willId, will.owner);
    }

    function prolongWillWithTokens(uint256 _willId) public {
        uint256 fee = annualFee(_willId).mul(rateToken);
        require(fee <= token.balanceOf(msg.sender));

        token.charge(msg.sender, fee, bytes32(_willId));
        prolongWill(_willId);
    }

    function prolongWillWithEther(uint256 _willId) public payable {
        uint256 fee = annualFee(_willId).mul(rateEther);
        require(fee <= msg.value);

        uint256 change = msg.value.sub(fee);
        if (change > 0) {
            msg.sender.transfer(change);
        }

        prolongWill(_willId);
    }

    function applyWill(uint256 _willId, uint256 _decryptionKey) public onlyProvider(_willId) {
        Will storage will = wills[_willId];
        require(will.state == WillState.Activated);

        will.decryptionKey = _decryptionKey;
        will.state = WillState.Pending;
        will.updatedAt = now;
        beneficiaryWills[will.beneficiaryHash].push(_willId);

        //todo: send a small amount of ethers to the beneficiary

        WillStateUpdated(_willId, will.owner, will.state);
    }

    function claimWill(uint256 _willId) public {
        Will storage will = wills[_willId];
        require(will.state == WillState.Pending);
        require(uint256(keccak256(msg.sender)) == will.beneficiaryHash);

        will.state = WillState.Claimed;

        token.safeTransfer(will.provider, claimReward(will));
        escrowWallet.fund(_willId, will.provider, claimReward(will));

        WillStateUpdated(_willId, will.owner, will.state);
    }

    function declineWill(uint256 _willId) public onlyProvider(_willId) {
        Will storage will = wills[_willId];
        require(will.state == WillState.Activated);
        require(will.validTill < now);

        will.state = WillState.Declined;
        will.updatedAt = now;

        WillStateUpdated(_willId, will.owner, will.state);
    }
}
