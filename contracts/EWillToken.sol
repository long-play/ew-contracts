pragma solidity ^0.4.18;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/token/DetailedERC20.sol';
import 'zeppelin-solidity/contracts/token/StandardToken.sol';
//import './EWillTokenIf.sol'; // removed due to a bug of truffle - https://github.com/trufflesuite/truffle/issues/593


contract EWillToken is /*EWillTokenIf,*/ Ownable, DetailedERC20('E-Will Token', 'EWILL', 18), StandardToken {
    // State Variables
    address public platform;

    // Events
    event Charged(address payer, uint256 amount);

    // Modifiers
    modifier onlyPlatform() {
        require(platform == msg.sender);
        _;
    }

    // Constructor
    function EWillToken(uint256 _totalSupply) public {
        totalSupply = _totalSupply;
        balances[msg.sender] = totalSupply;
    }

    // Configuration
    function setPlatformAddress(address _platform) public onlyOwner {
        platform = _platform;
    }

    // EWillTokenIf
    function charge(address _payer, uint256 _amount) public onlyPlatform {
        require(_amount <= balances[_payer]);

        balances[_payer] = balances[_payer].sub(_amount);
        balances[msg.sender] = balances[msg.sender].add(_amount);

        Charged(_payer, _amount);
    }
}
