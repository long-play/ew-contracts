pragma solidity ^0.4.18;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import './EWillEscrowIf.sol';


contract EWillEscrow is EWillEscrowIf, Ownable {
    // Constructor
    function EWillEscrow() public {
    }

    // EWillEscrowIf
    function fund(uint256 _willId, address _provider) public payable {
        Funded(_willId, _provider, msg.value);
    }
}
