pragma solidity ^0.4.18;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/token/SafeERC20.sol';
import 'contracts/EWillToken.sol';


contract EWillPreTokensale is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for EWillToken;

    // Constants
    string constant public name = "E-Will Pre-Tokensale";
    uint256 constant public tokenTotalSupply = 100000 * 1 ether;
    uint256 constant public preTokenSaleCap  = tokenTotalSupply / 20;
    uint256 constant public devTokenShare    = tokenTotalSupply / 2;
    uint256 constant public minContribution  = 1 * 1 ether;
    uint256 constant public maxContribution  = 100 * 1 ether;

    // State Variables
    EWillToken public token;
    bool    public finalized = false;
    uint256 public rate      = 0;
    uint256 public startDate = 0;
    uint256 public endDate   = 0;
    uint256 public collected = 0;

    // Events
    event NewContribution(address holder, uint256 tokenAmount);
    event PreTokensaleFinalized(uint256 collected);

    // Modifiers
    modifier notFinalized() {
        require(finalized == false);
        _;
    }

    modifier isSaleActive() {
        require(now >= startDate && now <= endDate && collected < preTokenSaleCap);
        _;
    }

    modifier isAcceptableAmount(uint256 _contribution) {
        require(_contribution >= minContribution && _contribution <= maxContribution);
        _;
    }

    // Constructor
    function EWillPreTokensale(uint256 _rate, uint256 _startDate, uint256 _endDate) public {
        require(_rate > 0);
        require(_startDate > now);
        require(_endDate > _startDate);
        token = new EWillToken(tokenTotalSupply);
        rate = _rate;
        startDate = _startDate;
        endDate = _endDate;
    }

    // Public functions
    function() public payable {
        purchase();
    }

    function finalize(address _tokensaleContract) public onlyOwner notFinalized {
        require(endDate < now);
        uint256 tokenBalance = token.balanceOf(this);
        token.safeTransfer(_tokensaleContract, tokenBalance);
        finalized = true;

        PreTokensaleFinalized(collected);
    }

    // Internal functions
    function purchase() internal isAcceptableAmount(msg.value) isSaleActive notFinalized {
        uint256 contribution = msg.value;
        uint256 toBuy = contribution.mul(rate);
        uint256 allowedToBuy = toBuy;

        if (collected.add(allowedToBuy) > preTokenSaleCap) {
            allowedToBuy = preTokenSaleCap.sub(collected);
            require(allowedToBuy > rate);

            contribution = allowedToBuy.div(rate);
            allowedToBuy = contribution.mul(rate);
            msg.sender.transfer(msg.value.sub(contribution));
        }

        owner.transfer(contribution);
        token.safeTransfer(msg.sender, allowedToBuy);
        collected = collected.add(allowedToBuy);

        NewContribution(msg.sender, allowedToBuy);
    }
}
