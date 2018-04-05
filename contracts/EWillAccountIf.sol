pragma solidity ^0.4.21;


contract EWillAccountIf {
    event Funded(uint256 willId, uint256 amount);

    function fund(uint256 _willId, uint256 _amount) public;
}
