pragma solidity ^0.4.24;


contract EWillFinanceIf {
    function platformFee(uint64 _years) public view returns (uint256);
    function totalFee(uint64 _years, address _provider, address _referrer) public view returns (uint256 fee, uint256 refReward, uint256 subsidy);
    function totalFeeEthers(uint64 _years, address _provider, address _referrer) public view returns (uint256 fee, uint256 refReward, uint256 subsidy);
    function totalFeeTokens(uint64 _years, address _provider, address _referrer) public view returns (uint256 fee, uint256 refReward, uint256 subsidy);
    function centsToTokens(uint256 _cents) public view returns (uint256);

    function charge(address _customer, address _provider, address _referrer, uint64 _years, bytes32 _note) public payable;
    function refund(address _customer, uint256 _amount, uint256 _willId) public;
    function reward(address _provider, uint256 _amount, uint256 _willId) public;
}
