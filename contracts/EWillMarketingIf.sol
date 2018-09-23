pragma solidity ^0.4.24;


contract EWillMarketingIf {
    function referrerDiscount(uint256 _platformFee, uint256 _providerFee, address _provider, address _referrer) public view returns (uint256 discount, uint256 refReward);
    function applyDiscount(uint256 _platformFee, uint256 _providerFee, address _provider, address _referrer) public returns (uint256 discount, uint256 refReward);
}
