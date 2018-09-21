pragma solidity ^0.4.24;


contract EWillEscrowIf {
    // Custom Types
    enum ProviderState { None, Pending, Whitelisted, Activated, Banned }

    // Events
    event Funded(address provider, uint256 amount, uint256 willId);
    event Refunded(address customer, uint256 amount, uint256 willId);

    // Public Functions
    function fund(address _provider, uint256 _amount, uint256 _willId) public;
    function refund(address _customer, uint256 _amount, uint256 _willId) public;
    function isProviderValid(address _provider) view public returns (bool);
    function providerAddress(address _delegate) view public returns (address);
    function providerInfo(address _provider) view public returns (uint256 annualFee, uint256 info, address delegate, ProviderState state);
}
