pragma solidity ^0.4.18;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import './EWillAccountIf.sol';


contract EWillAccount is EWillAccountIf, Ownable {
    // Constructor
    function EWillAccount() public {
    }

    // EWillAccountIf
    function fund(uint256 _willId) public payable {
        Funded(_willId, msg.value);
    }
}
