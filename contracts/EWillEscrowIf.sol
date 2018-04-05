pragma solidity ^0.4.21;


contract EWillEscrowIf {
    event Funded(uint256 willId, address provider, uint256 amount);

    function fund(uint256 _willId, address _provider, uint256 _amount) public;
    function isProviderValid(address _provider) constant public returns (bool);
    function providerAddress(address _delegate) constant public returns (address);
}
