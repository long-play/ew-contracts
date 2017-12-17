pragma solidity ^0.4.18;


contract EWillAccountIf {
    event Funded(uint256 willId, uint256 amount);

    function fund(uint256 _willId) public payable;
}
