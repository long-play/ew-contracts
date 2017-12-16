pragma solidity ^0.4.18;

import 'zeppelin-solidity/contracts/token/DetailedERC20.sol';
import 'zeppelin-solidity/contracts/token/StandardToken.sol';


contract EWillToken is DetailedERC20('EWill', 'EWILL', 18), StandardToken {
  // Constructor
  function EWillToken() public {
    totalSupply = 100000;
    balances[msg.sender] = totalSupply;
  }
}
