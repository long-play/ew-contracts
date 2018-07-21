pragma solidity ^0.4.24;


contract EWillFinanceIf {
    function charge(address _customer, uint256 _providerFee, address _referrer, bytes32 _note) public payable;
    function reward(address _provider, uint256 _amount, uint256 _willId) public;
    function centsToTokens(uint256 _cents) public view returns (uint256);
}
