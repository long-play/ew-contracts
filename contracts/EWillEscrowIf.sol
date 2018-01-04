pragma solidity ^0.4.18;


contract EWillEscrowIf {
    event Funded(uint256 willId, address provider, uint256 amount);

    function fund(uint256 _willId, address _provider) public payable;
    function isProviderValid(address _provider) constant public returns (bool);
}
