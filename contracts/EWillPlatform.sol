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
        uint256     beneficiaryHash;
        uint256     decryptionKey;
        address     owner;
        WillState   state;
        bool        payWithTokens;
        uint256     createdAt;
        uint256     updatedAt;
        uint256     validTill;
        address     provider;
    }

    // Constants
    string constant public name = 'E-Will Platform';

    // State Variables
    uint256 public annualPlatformFee; // annual platform fee in weis
    mapping (address => uint256) public annualProviderFee;   // annual provider fee in weis

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

    modifier sufficientTokenAmountForCreate(address _provider) {
        require(creatingFee(_provider) <= token.balanceOf(msg.sender));
        _;
    }

    modifier sufficientTokenAmountForProlong(uint256 _willId) {
        require(annualFee(_willId) <= token.balanceOf(msg.sender));
        _;
    }

    modifier sufficientAmountForCreate(address _provider) {
        require(creatingFee(_provider) <= msg.value);
        _;
    }

    modifier sufficientAmountForProlong(uint256 _willId) {
        require(annualFee(_willId) <= msg.value);
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

    // Finance
    function creatingFee(address _provider) public constant returns (uint256) {
        return annualProviderFee[_provider] * 12 / 10 + annualPlatformFee;
    }

    function annualFee(uint256 _willId) public constant returns (uint256) {
        return annualFee(wills[_willId]);
    }

    function annualFee(Will _will) private constant returns (uint256) {
        return _will.annualFee + annualPlatformFee;
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

    // Internal Will
    function createWill(uint256 _willId, uint256 _storageId, uint256 _beneficiaryHash, address _provider, bool _payWithTokens) internal {
        require(escrowWallet.isProviderValid(_provider));
        require(wills[_willId].state == WillState.None);
        require(address(_willId >> 96) == _provider);

        wills[_willId] = Will({
            willId: _willId,
            storageId: _storageId,
            annualFee: /*todo: recalc*/annualProviderFee[_provider],
            owner: msg.sender,
            state: WillState.Created,
            payWithTokens: _payWithTokens,
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

    function prolongWillInternal(uint256 _willId, bool _payWithTokens) internal {
        Will storage will = wills[_willId];
        require(will.state == WillState.Activated);
        require(will.payWithTokens == _payWithTokens);

        will.validTill += 1 years;

        WillProlonged(_willId, will.owner, will.validTill);
    }

    // Public Will
    function createWillWithTokens(uint256 _willId, uint256 _storageId, uint256 _beneficiaryHash, address _provider) public sufficientTokenAmountForCreate(_provider) {
        uint256 fee = creatingFee(_provider);
        //todo: convert to tokens
        token.charge(msg.sender, fee, bytes32(_willId));
        token.safeTransfer(accountWallet, annualPlatformFee);

        createWill(_willId, _storageId, _beneficiaryHash, _provider, true);
    }

    function createWill(uint256 _willId, uint256 _storageId, uint256 _beneficiaryHash, address _provider) public payable sufficientAmountForCreate(_provider) {
        uint256 fee = creatingFee(_provider);
        uint256 change = msg.value - fee;
        if (change > 0) {
            msg.sender.transfer(change);
        }

        accountWallet.fund.value(annualPlatformFee)(_willId);
        createWill(_willId, _storageId, _beneficiaryHash, _provider, false);
    }

    function activateWill(uint256 _willId) public onlyProvider(_willId) {
        Will storage will = wills[_willId];
        require(will.state == WillState.Created);

        will.state = WillState.Activated;
        will.updatedAt = now;
        will.validTill = now + 1 years;

        escrowWallet.fund.value(activationReward(will))(_willId, will.provider);

        WillStateUpdated(_willId, will.owner, will.state);
    }

    function refreshWill(uint256 _willId) public onlyProvider(_willId) {
        Will storage will = wills[_willId];
        require(will.state == WillState.Activated);
        require(will.updatedAt + 28 days < now);

        will.updatedAt = now;

        escrowWallet.fund.value(refreshReward(will))(_willId, will.provider);

        WillRefreshed(_willId, will.owner);
    }

    function decreaseWillAnnualFee(uint256 _willId, uint256 _annualProviderFee) public onlyProvider(_willId) {
        Will storage will = wills[_willId];
        require(will.annualFee > _annualProviderFee);

        will.annualFee = _annualProviderFee;

        WillAnnualFeeDecreased(_willId, will.annualFee);

        //todo: prolong the will within unspent funds
        WillProlonged(_willId, will.owner, will.validTill);
    }

    function prolongWillWithTokens(uint256 _willId) public sufficientTokenAmountForProlong(_willId) {
        uint256 fee = annualFee(_willId);
        //todo: convert to tokens
        token.charge(msg.sender, fee, bytes32(_willId));
        token.safeTransfer(accountWallet, annualPlatformFee);

        prolongWillInternal(_willId, true);
    }

    function prolongWill(uint256 _willId) public payable sufficientAmountForProlong(_willId) {
        uint256 fee = annualFee(_willId);
        uint256 change = msg.value - fee;
        if (change > 0) {
            msg.sender.transfer(change);
        }

        accountWallet.fund.value(annualPlatformFee)(_willId);
        prolongWillInternal(_willId, false);
    }

    function applyWill(uint256 _willId, uint256 _decryptionKey) public onlyProvider(_willId) {
        Will storage will = wills[_willId];
        require(will.state == WillState.Activated);

        will.decryptionKey = _decryptionKey;
        will.state = WillState.Pending;
        will.updatedAt = now;
        beneficiaryWills[will.beneficiaryHash].push(_willId);

        WillStateUpdated(_willId, will.owner, will.state);
    }

    function claimWill(uint256 _willId) public {
        Will storage will = wills[_willId];
        require(will.state == WillState.Pending);
        require(uint256(keccak256(msg.sender)) == will.beneficiaryHash);

        will.state = WillState.Claimed;

        //todo: return unspent funds to the beneficiary
        escrowWallet.fund.value(claimReward(will))(_willId, will.provider);

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
