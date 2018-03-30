pragma solidity ^0.4.18;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/token/SafeERC20.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import './EWillAccountIf.sol';
import './EWillTokenIf.sol';


contract EWillAccount is EWillAccountIf, Ownable {
    using SafeMath for uint256;
    using SafeERC20 for EWillTokenIf;

    // Custom Types
    struct TokenHolder {
        uint256     amount;
        bool        verified;
    }

    // Constants
    string constant public name = 'E-Will Account';

    // State Variables
    uint256 public income;          // the income of the platform
    uint256 public lastPayout;      // the last time the accounter was paid
    uint256 public minLockedFund;   // min amount of tokens for parking

    address public accounter;       // the address for operational expenses
    address public platform;        // platform address
    EWillTokenIf public token;      // token interface
    mapping (address => bool) kyc;  // known customers

    // Events
    event Parked(address holder, uint256 amount);
    event Unparked(address holder, uint256 amount);
    event Rewarded(address holder, uint256 amount);
    event Withdrew(uint256 amount);

    // Modifiers
    modifier onlyPlatform {
        require(msg.sender == platform);
        _;
    }

    modifier onlyVerifiedCustomer() {
        require(kyc[msg.sender] == true);
        _;
    }

    // Constructor
    function EWillAccount(uint256 _minFund, address _accounter) public {
        minLockedFund = _minFund * 1 ether;
        accounter = _accounter;
        lastPayout = 0;
        income = 0;
    }

    // Configuration
    function setAccounter(address _accounter) public onlyOwner {
        accounter = _accounter;
    }

    function setMinLockedFund(uint256 _minFund) public onlyOwner {
        minLockedFund = _minFund * 1 ether;
    }

    // KYC
    function addVerifiedCustomer(address _customer) public onlyOwner {
        kyc[_customer] = true;
    }

    function deleteVerifiedCustomer(address _customer) public onlyOwner {
        kyc[_customer] = false;
    }

    // Accounting
    function payOperationalExpenses(uint256 _amount) public onlyOwner {
        require(now - lastPayout >= 30 days); // don't allow to payout too often
        require(_amount <= income / 2);  // don't allow to withdraw more than a half of entire fund

        lastPayout = now;
        income = income.sub(_amount);
        token.safeTransfer(accounter, _amount);
        Withdrew(_amount);
    }

    // Fund parking
    function park(uint256 _amount) public onlyVerifiedCustomer {
        require(_amount >= minLockedFund);

        token.charge(msg.sender, _amount, bytes32('parking'));
        //todo: park tokens to get rewarded
        require(false);

        Parked(msg.sender, _amount);
    }

    function unpark() public {
        //todo: withdraw the all parked by the sender tokens
        require(false);

        Unparked(msg.sender, 0);
    }

    function distributeInterest(uint256 _amount) public onlyOwner {
        //todo: reward holders of parked tokens
        require(false);

        Rewarded(this, _amount);
    }

    // EWillAccountIf
    function fund(uint256 _willId, uint256 _amount) public onlyPlatform {
        income = income.add(_amount);
        Funded(_willId, _amount);
    }
}
