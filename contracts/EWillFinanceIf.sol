pragma solidity ^0.4.24;


contract EWillFinanceIf {
    function platformFee() public view returns (uint256);
    function totalFee(uint256 _providerFee, bool _referrer) public view returns (uint256 fee, uint256 refReward);
    function totalFeeEthers(uint256 _providerFee, bool _referrer) public view returns (uint256 fee, uint256 refReward);
    function totalFeeTokens(uint256 _providerFee, bool _referrer) public view returns (uint256 fee, uint256 refReward);
    function centsToTokens(uint256 _cents) public view returns (uint256);

    function charge(address _customer, uint256 _providerFee, address _referrer, bytes32 _note) public payable;
    function reward(address _provider, uint256 _amount, uint256 _willId) public;
}
