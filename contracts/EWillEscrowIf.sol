pragma solidity ^0.4.24;


contract EWillEscrowIf {
    event Funded(address provider, uint256 amount, uint256 willId);

    function fund(address _provider, uint256 _amount, uint256 _willId) public;
    function isProviderValid(address _provider) constant public returns (bool);
    function providerAddress(address _delegate) constant public returns (address);
}
