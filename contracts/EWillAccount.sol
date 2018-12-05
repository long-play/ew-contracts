pragma solidity ^0.4.24;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/token/ERC20/SafeERC20.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import './EWillAccountIf.sol';
import './EWillTokenIf.sol';


contract EWillAccount is EWillAccountIf, Ownable {
    using SafeMath for uint256;
    using SafeERC20 for EWillTokenIf;

    // Constants
    string constant public name = 'E-will Account';

    // State Variables
    address public accounter;                       // the address for operational expenses
    address public financeContract;                 // Finance Contract address
    EWillTokenIf public token;                      // token interface

    // Events
    event Withdrew(uint256 amount);

    // Modifiers
    modifier onlyFinance {
        require(msg.sender == financeContract);
        _;
    }

    // Constructor
    constructor(address _token, uint256 _minParkingAmount, address _accounter) public {
        token = EWillTokenIf(_token);
        accounter = _accounter;
    }

    // Configuration
    function setFinance(address _financeContract) public onlyOwner {
        require(financeContract == 0x0);
        financeContract = _financeContract;
    }

    function setAccounter(address _accounter) public onlyOwner {
        accounter = _accounter;
    }

    // Accounting
    function payOperationalExpenses(uint256 _amount) public onlyOwner {
        token.safeTransfer(accounter, _amount);
        emit Withdrew(_amount);
    }

    // EWillAccountIf
    function fund(uint256 _willId, uint256 _amount) public onlyFinance {
        emit Funded(_willId, _amount);
    }
}
