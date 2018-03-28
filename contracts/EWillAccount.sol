pragma solidity ^0.4.18;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import './EWillAccountIf.sol';


contract EWillAccount is EWillAccountIf, Ownable {
    // Constants
    string constant public name = 'E-Will Account';

    // State Variables
    address public accounter;       // the address for operational expenses
    uint256 public lastPayout;      // the last time the accounter was paid
    uint256 public minLockedFund;   // min amount of tokens for parking
    mapping (address => bool) kyc;  // known customers

    // Events
    event Parked(address holder, uint256 amount);
    event Unparked(address holder, uint256 amount);
    event Rewarded(address holder, uint256 amount);
    event Withdrew(uint256 amount);

    // Modifiers
    modifier onlyVerifiedCustomer() {
        require(kyc[msg.sender] == true);
        _;
    }

    // Constructor
    function EWillAccount(uint256 _minFund, address _accounter) public {
        minLockedFund = _minFund * 1 ether;
        accounter = _accounter;
        lastPayout = 0;
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
        require(now - lastPayout >= 28 days); // don't allow to payout too often
        require(_amount <= this.balance / 2);  // don't allow to withdraw more than a half of entire fund

        lastPayout = now;
        accounter.transfer(_amount);
        Withdrew(_amount);
    }

    // Fund parking
    function park(uint256 _amount) public onlyVerifiedCustomer {
        require(_amount >= minLockedFund);

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
    function fund(uint256 _willId) public payable {
        Funded(_willId, msg.value);
    }
}
