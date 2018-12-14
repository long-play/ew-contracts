pragma solidity ^0.4.24;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/token/ERC20/SafeERC20.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import './EWillMarketingIf.sol';
import './EWillTokenIf.sol';


contract EWillMarketing is EWillMarketingIf, Ownable {
    using SafeMath for uint256;
    using SafeERC20 for EWillTokenIf;

    // Types
    struct Discount {
        mapping (address => uint32) providerDiscounts;
        uint32                      discount;
        uint32                      reward;
        uint64                      startAt;
        uint64                      endAt;
        uint32                      remain;
    }

    // Constants
    string constant public name = 'E-will Marketing';
    uint32 constant private DEFAULT_NUMBER_OF_DISCOUNTS = 100;
    uint256 constant private PERCENT_MULTIPLIER         = 1000;

    // State Variables
    address public finance;
    address public marketer;
    EWillTokenIf public token;
    mapping (address => Discount) internal discounts;
    uint32 refCodeDiscount;
    uint32 refCodeReward;
    
    // Events

    // Modifiers
    modifier onlyMarketer {
        require(msg.sender == marketer);
        _;
    }

    modifier onlyFinance {
        require(msg.sender == finance);
        _;
    }

    // Constructor
    constructor(address _finance, address _marketer, address _token) public {
        token = EWillTokenIf(_token);
        finance = _finance;
        marketer = _marketer;
        refCodeDiscount = 200;  // 20%
        refCodeReward = 200;    // 20%
    }

    // Configuration
    function setFinance(address _finance) public onlyOwner {
        finance = _finance;
    }

    function setMarketer(address _marketer) public onlyOwner {
        marketer = _marketer;
    }

    function setRefCodeParams(uint32 _discount, uint32 _reward) public onlyMarketer {
        require(_discount + _reward <= PERCENT_MULTIPLIER);
        refCodeDiscount = _discount;
        refCodeReward = _reward;
    }

    function addDiscount(address _referrer,
                         uint64 _startAt,
                         uint64 _endAt,
                         uint32 _discount,
                         uint32 _reward,
                         uint32 _numberOfDiscounts,
                         address[] _providers,
                         uint32[] _discounts) public onlyMarketer {
        require(_startAt < _endAt);
        require(_discount < PERCENT_MULTIPLIER);
        require(_reward < PERCENT_MULTIPLIER);
        require(_numberOfDiscounts > 0);
        require(_providers.length == _discounts.length);
        require(_providers.length <= 256);
        discounts[_referrer] = Discount({
            discount:   _discount,
            reward:     _reward,
            startAt:    _startAt,
            endAt:      _endAt,
            remain:     _numberOfDiscounts
        });

        Discount storage discountInfo = discounts[_referrer];
        for (uint8 i = 0; i < _providers.length; i++) {
            discountInfo.providerDiscounts[_providers[i]] = _discounts[i];
        }
    }

    // Public Marketing
    function createRefCode(address _referrer) public onlyFinance {
        discounts[_referrer] = Discount({
            discount:   refCodeDiscount,
            reward:     refCodeReward,
            startAt:    currentTime(),
            endAt:      currentTime() + uint64(365 days),
            remain:     DEFAULT_NUMBER_OF_DISCOUNTS
        });
    }

    function referrerDiscount(uint256 _platformFee,
                              uint256 _providerFee,
                              address _provider,
                              address _referrer) public view returns (uint256 discount, uint256 refReward) {
        Discount storage discountInfo = discounts[_referrer];
        if (currentTime() < discountInfo.startAt || currentTime() > discountInfo.endAt || discountInfo.remain == 0) {
            return;
        }
        discount = _platformFee.mul(discountInfo.discount).div(PERCENT_MULTIPLIER);
        uint256 provDiscount = _providerFee.mul(discountInfo.providerDiscounts[_provider]).div(PERCENT_MULTIPLIER);
        if (provDiscount == 0) {
            provDiscount = _providerFee.mul(discountInfo.providerDiscounts[address(0x0)]).div(PERCENT_MULTIPLIER);
        }
        discount = discount.add(provDiscount);
        refReward = _platformFee.mul(discountInfo.reward).div(PERCENT_MULTIPLIER);
    }

    function applyDiscount(uint256 _platformFee,
                           uint256 _providerFee,
                           address _provider,
                           address _referrer) public onlyFinance returns (uint256 discount, uint256 refReward) {
        Discount storage discountInfo = discounts[_referrer];
        (discount, refReward) = referrerDiscount(_platformFee, _providerFee, _provider, _referrer);

        if (address(0x0) != _referrer) {
            token.safeTransfer(_referrer, refReward);
        }
        if (discountInfo.remain > 0) {
            discountInfo.remain--;
        }

        token.safeTransfer(tx.origin, discount);
    }

    // Internal
    function currentTime() internal view returns (uint64) {
        return uint64(now);
    }
}
