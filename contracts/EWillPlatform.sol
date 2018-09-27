pragma solidity ^0.4.24;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import './EWillFinanceIf.sol';
import './EWillAccountIf.sol';
import './EWillEscrowIf.sol';


contract EWillPlatform is Ownable {
    using SafeMath for uint256;

    // Custom Types
    enum WillState { None, Created, Activated, Pending, Claimed, Rejected, Deleted }

    struct Will {
        uint256     willId;
        uint256     storageId;
        uint256     annualFee;
        uint256     newFee;
        uint256     beneficiaryHash;
        uint256     decryptionKey;
        address     owner;
        uint64      updatedAt;
        address     provider;
        uint64      validTill;
        WillState   state;
        string      title;
    }

    // Constants
    string constant public name                 = 'E-will Platform';
    uint64 constant private ONE_YEAR            = uint64(365 days);
    uint64 constant private PERIOD_LENGTH       = uint64(30 days);
    uint64 constant private NUMBER_OF_PERIODS   = 12; // periods per year

    // State Variables
    mapping (uint256 => Will) public wills;
    //todo: remove both mappings and add events instead
    mapping (address => uint256[]) public userWills;
    mapping (uint256 => uint256[]) public beneficiaryWills;
    address public platformAddress;

    EWillFinanceIf public financeWallet;
    EWillEscrowIf public escrowWallet;

    // Events
    event WillCreated(address indexed owner, address indexed provider, uint256 willId);
    event WillStateUpdated(uint256 indexed willId, address indexed owner, WillState newState);
    event WillRefreshed(uint256 indexed willId, address indexed owner);
    event WillProlonged(uint256 indexed willId, address indexed owner, uint256 validTill);

    // Modifiers
    modifier onlyWillOwner(uint256 _willId) {
        Will storage will = wills[_willId];
        require(will.owner == msg.sender);
        _;
    }

    modifier onlyProvider(uint256 _willId) {
        Will storage will = wills[_willId];
        address provider = escrowWallet.providerAddress(msg.sender);
        require(will.provider == provider);
        _;
    }

    // Constructor
    constructor(address _finance, address _escrow, address _platformAddress) public {
        financeWallet = EWillFinanceIf(_finance);
        escrowWallet = EWillEscrowIf(_escrow);
        platformAddress = _platformAddress;
    }

    // Configuration
    //todo: add config for contracts & public key

    // Finance calculations
    function annualPlatformFee(uint64 _years) public view returns (uint256) {
        return financeWallet.platformFee(_years);
    }

    function refreshingReward(uint256 _annualFee) private pure returns (uint256) {
        return _annualFee / NUMBER_OF_PERIODS;
    }

    // Public Will
    function numberOfUserWills(address _user) public view returns (uint256) {
        return userWills[_user].length;
    }

    function numberOfBeneficiaryWills(address _beneficiary) public view returns (uint256) {
        return beneficiaryWills[addressKeccak256(_beneficiary)].length;
    }

    function createWill(string _title, uint256 _willId, uint256 _storageId, uint64 _years, uint256 _beneficiaryHash, address _provider, address _referrer) public payable {
        require(escrowWallet.isProviderValid(_provider));
        require(wills[_willId].state == WillState.None);
        require(address(_willId >> 96) == _provider);
        require(_years > 0 && _years < 101);

        // charge the user and distribute the fee
        uint256 fee;
        (fee, ) = escrowWallet.providerInfo(_provider);
        financeWallet.charge.value(msg.value)(msg.sender, _provider, _referrer, _years, bytes32(_willId));

        // create the will
        wills[_willId] = Will({
            title: _title,
            willId: _willId,
            storageId: _storageId,
            annualFee: financeWallet.centsToTokens(fee),
            newFee: 0,
            owner: msg.sender,
            state: WillState.Created,
            beneficiaryHash: _beneficiaryHash,
            decryptionKey: 0,
            updatedAt: currentTime(),
            validTill: _years,
            provider: _provider
        });
        userWills[msg.sender].push(_willId);

        // emit events
        emit WillCreated(msg.sender, _provider, _willId);
        emit WillStateUpdated(_willId, msg.sender, WillState.Created);
    }

    function activateWill(uint256 _willId) public onlyProvider(_willId) {
        Will storage will = wills[_willId];
        require(will.state == WillState.Created);

        will.state = WillState.Activated;
        will.updatedAt = currentTime();
        will.validTill = currentTime() + will.validTill * ONE_YEAR;

        emit WillStateUpdated(_willId, will.owner, will.state);
    }

    function refreshWill(uint256 _willId) public onlyProvider(_willId) {
        Will storage will = wills[_willId];
        require(will.state == WillState.Activated);
        require(currentTime() > will.updatedAt + PERIOD_LENGTH);

        if (will.newFee > 0) {
            // update annual fee and set last update to the start of the new year if it's a new year
            will.updatedAt = will.validTill - ONE_YEAR;
            will.annualFee = will.newFee;
            will.newFee = 0;
        }
        else {
            will.updatedAt = currentTime();
        }

        financeWallet.reward(will.provider, refreshingReward(will.annualFee), _willId);

        emit WillRefreshed(_willId, will.owner);
    }

    function prolongWill(uint256 _willId, uint64 _years) public payable {
        Will storage will = wills[_willId];
        require(will.state == WillState.Activated);
        // allow to prolong the will in the last period of the previous subscription only
        require(will.validTill < currentTime() + PERIOD_LENGTH);
        require(_years > 0 && _years < 101);

        // charge the user and distribute the fee
        uint256 fee;
        (fee, ) = escrowWallet.providerInfo(will.provider);
        financeWallet.charge.value(msg.value)(msg.sender, will.provider, 0x0, _years, bytes32(_willId));

        // update the will
        will.newFee = financeWallet.centsToTokens(fee);
        will.validTill += ONE_YEAR * _years;

        // emit an event
        emit WillProlonged(_willId, will.owner, will.validTill);
    }

    function applyWill(uint256 _willId, uint256 _decryptionKey) public onlyProvider(_willId) {
        Will storage will = wills[_willId];
        require(will.state == WillState.Activated);

        will.decryptionKey = _decryptionKey;
        will.state = WillState.Pending;
        will.updatedAt = currentTime();
        beneficiaryWills[will.beneficiaryHash].push(_willId);

        //todo: send a small amount of ethers to the beneficiary
        // it's impossible for the current paradigm due to unknown address of a beneficiary

        emit WillStateUpdated(_willId, will.owner, will.state);
    }

    function claimWill(uint256 _willId) public {
        Will storage will = wills[_willId];
        require(will.state == WillState.Pending);
        require(addressKeccak256(msg.sender) == will.beneficiaryHash);

        will.state = WillState.Claimed;

        emit WillStateUpdated(_willId, will.owner, will.state);
    }

    function rejectWill(uint256 _willId) public onlyProvider(_willId) {
        Will storage will = wills[_willId];
        require(will.state == WillState.Activated);
        require(will.validTill < currentTime());

        will.state = WillState.Rejected;
        will.updatedAt = currentTime();

        emit WillStateUpdated(_willId, will.owner, will.state);
    }

    function deleteWill(uint256 _willId) public {
        Will storage will = wills[_willId];
        require(will.owner == msg.sender);
        require(will.state == WillState.Activated);
        require(will.validTill > currentTime());

        uint256 wholePeriods = (will.validTill - currentTime()) / PERIOD_LENGTH;
        will.state = WillState.Deleted;
        will.updatedAt = currentTime();
        financeWallet.refund(will.owner, refreshingReward(will.annualFee).mul(wholePeriods).div(NUMBER_OF_PERIODS), _willId);

        emit WillStateUpdated(_willId, will.owner, will.state);
    }

    // Internal
    function addressKeccak256(address _address) internal pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(_address)));
    }

    function currentTime() internal view returns (uint64) {
        return uint64(now);
    }
}
