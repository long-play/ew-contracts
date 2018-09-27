pragma solidity ^0.4.24;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/token/ERC20/SafeERC20.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import './EWillMarketingIf.sol';
import './EWillFinanceIf.sol';
import './EWillAccountIf.sol';
import './EWillEscrowIf.sol';
import './EWillTokenIf.sol';


contract EWillFinance is EWillFinanceIf, Ownable {
    using SafeMath for uint256;
    using SafeERC20 for EWillTokenIf;

    // Constants
    string constant public name = 'E-will Finance';

    // State Variables
    uint256 internal annualPlatformFee;                     // annual platform fee in cents
    uint256 public rateEther;                               // exchange rate, weis per cent
    uint256 public rateToken;                               // exchange rate, tokenweis per cent
    uint256 public exchangeFee;                             // exchanging token->ether fee in percent
    uint256 public exchangeLimit;                           // exchanging limit, in percent of total supply
    uint256 public referrerDiscount;                        // discount if referenced, in percent

    EWillMarketingIf public marketingWallet;
    EWillAccountIf public accountWallet;
    EWillEscrowIf public escrowWallet;
    EWillTokenIf public token;
    address public platform;
    address public oracle;

    // Events

    // Modifiers
    modifier onlyOracle {
        require(msg.sender == oracle);
        _;
    }

    modifier onlyPlatform {
        require(msg.sender == platform);
        _;
    }

    // Constructor
    constructor(uint256 _annualFee, address _account, address _escrow, address _token) public {
        annualPlatformFee = _annualFee;
        accountWallet = EWillAccountIf(_account);
        escrowWallet = EWillEscrowIf(_escrow);
        token = EWillTokenIf(_token);
        oracle = owner;
        rateToken = 1 ether;
        rateEther = 1 ether;

        exchangeFee = 5;
        exchangeLimit = 5;
        referrerDiscount = 0;
    }

    // Configuration
    function setMarketing(address _marketing) public onlyOwner {
        marketingWallet = EWillMarketingIf(_marketing);
    }

    function setPlatform(address _platform) public onlyOwner {
        require(platform == 0x0);
        platform = _platform;
    }

    function setOracle(address _oracle) public onlyOwner {
        oracle = _oracle;
    }

    function setExchangeRates(uint256 _token, uint256 _ether) public onlyOracle {
        require(_token > 0);
        require(_ether > 0);
        rateToken = _token;
        rateEther = _ether;
    }

    function setExchangeFee(uint256 _percent) public onlyOwner {
        require(_percent >= 0);
        require(_percent < 100);
        exchangeFee = _percent;
    }

    function setExchangeLimit(uint256 _percent) public onlyOwner {
        require(_percent >= 0);
        require(_percent < 100);
        exchangeLimit = _percent;
    }

    function setReferrerDiscount(uint256 _percent) public onlyOwner {
        require(_percent >= 0);
        require(_percent < 50);
        referrerDiscount = _percent;
    }

    function setAnnaulPlatformFee(uint256 _fee) public onlyOwner {
        require(_fee > 0);
        annualPlatformFee = _fee;
    }

    // Public Financing
    function platformFee(uint64 _years) public view returns (uint256) {
        return annualPlatformFee * _years;
    }

    function totalFee(uint64 _years, address _provider, address _referrer) public view returns (uint256 fee, uint256 refReward, uint256 subsidy) {
        (fee, ) = escrowWallet.providerInfo(_provider);
        uint256 fullPlatformFee = platformFee(_years);
        uint256 fullProviderFee = fee.mul(_years);
        if (address(0x0) != address(marketingWallet)) {
            (subsidy, refReward) = marketingWallet.referrerDiscount(fullPlatformFee, fullProviderFee, _provider, _referrer);
        }
        fee = fullPlatformFee.add(fullProviderFee);
    }

    function totalFeeEthers(uint64 _years, address _provider, address _referrer) public view returns (uint256 fee, uint256 refReward, uint256 subsidy) {
        (fee, refReward, subsidy) = totalFee(_years, _provider, _referrer);
        fee = fee.mul(rateEther);
        refReward = refReward.mul(rateEther);
        subsidy = subsidy.mul(rateEther);
    }

    function totalFeeTokens(uint64 _years, address _provider, address _referrer) public view returns (uint256 fee, uint256 refReward, uint256 subsidy) {
        (fee, refReward, subsidy) = totalFee(_years, _provider, _referrer);
        fee = fee.mul(rateToken);
        refReward = refReward.mul(rateToken);
        subsidy = subsidy.mul(rateToken);
    }

    function centsToTokens(uint256 _cents) public view returns (uint256) {
        return _cents.mul(rateToken);
    }

    function exchangeTokens(uint256 _amount) public {
        require(token.balanceOf(this).add(_amount) <= token.totalSupply().mul(exchangeLimit).div(100));

        uint256 amount = _amount.mul(100 - exchangeFee).div(100);
        uint256 payout = amount.mul(rateEther).div(rateToken);
        token.charge(msg.sender, _amount, bytes32('token_exchange'));
        msg.sender.transfer(payout);
    }

    function charge(address _customer, address _provider, address _referrer, uint64 _years, bytes32 _note) public payable onlyPlatform {
        // get the fee amounts
        uint256 fee = 0;
        (fee,) = totalFeeTokens(_years, _provider, _referrer);

        // buy tokens
        if (msg.value > 0) {
            uint256 amount = msg.value.mul(rateToken).div(rateEther);
            token.safeTransfer(_customer, amount);
        }

        // charge fee in tokens
        token.charge(_customer, fee, _note);

        // transfer profit of the Platform to the account wallet
        uint256 profit = platformFee(_years).mul(rateToken);
        token.safeTransfer(accountWallet, profit);

        // transfer the provider fee to the escrow wallet
        token.safeTransfer(escrowWallet, fee.sub(profit));
    }

    function refund(address _customer, uint256 _amount, uint256 _willId) public onlyPlatform {
        escrowWallet.refund(_customer, _amount, _willId);
    }

    function reward(address _provider, uint256 _amount, uint256 _willId) public onlyPlatform {
        escrowWallet.fund(_provider, _amount, _willId);
    }
}
