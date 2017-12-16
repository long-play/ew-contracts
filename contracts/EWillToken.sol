pragma solidity ^0.4.18;

import 'zeppelin-solidity/contracts/token/DetailedERC20.sol';
import 'zeppelin-solidity/contracts/token/StandardToken.sol';


contract EWillToken is DetailedERC20('E-Will Token', 'EWILL', 18), StandardToken {
    // Constructor
    function EWillToken(uint256 _totalSupply) public {
        totalSupply = _totalSupply;
        balances[msg.sender] = totalSupply;
    }
}
