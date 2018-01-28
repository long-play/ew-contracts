pragma solidity ^0.4.18;

import 'zeppelin-solidity/contracts/token/ERC20Basic.sol';


contract EWillTokenIf is ERC20Basic {
    function charge(address _payer, uint256 _amount, bytes32 _note) public;
}
