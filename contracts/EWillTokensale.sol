pragma solidity ^0.4.24;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/token/ERC20/SafeERC20.sol';
import './EWillToken.sol';


contract EWillTokensale is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for EWillToken;

    // Constants
    string constant public name = "E-Will Tokensale";
    uint256 constant public minContribution  = 0.1 * 1 ether;
    uint256 constant public maxContribution  = 100 * 1 ether;

    // State Variables
    EWillToken public token;
    uint8   public currentRound = 0;
    bool    public finalized    = true;
    uint256 public tokenSaleCap = 0;
    uint256 public rate         = 0;
    uint256 public startDate    = 0;
    uint256 public endDate      = 0;
    uint256 public collected    = 0;

    // Events
    event NewContribution(address holder, uint256 tokenAmount);
    event TokensaleScheduled(uint8 round, uint256 startDate, uint256 rate, uint256 cap);
    event TokensaleFinalized(uint8 round, uint256 collected);

    // Modifiers
    modifier isFinalized() {
        require(finalized == true);
        _;
    }

    modifier notFinalized() {
        require(finalized == false);
        _;
    }

    modifier isSaleActive() {
        require(now >= startDate && now <= endDate && collected < tokenSaleCap);
        _;
    }

    modifier isAcceptableAmount(uint256 _contribution) {
        require(_contribution >= minContribution && _contribution <= maxContribution);
        _;
    }

    // Constructor
    constructor(address _token) public {
        token = EWillToken(_token);
    }

    // Configure
    function setRate(uint256 _rate) public onlyOwner {
        require(_rate > 0);
        rate = _rate;
    }

    // Public functions
    function scheduleTokensaleRound(uint256 _rate, uint256 _cap, uint256 _startDate, uint256 _endDate) public isFinalized {
        require(_rate > 0);
        require(_cap <= token.balanceOf(this));
        require(_startDate > now);
        require(_endDate > _startDate);
        rate = _rate;
        tokenSaleCap = _cap;
        startDate = _startDate;
        endDate = _endDate;

        finalized = false;
        collected = 0;
        currentRound += 1;

        emit TokensaleScheduled(currentRound, _startDate, _rate, _cap);
    }

    function() public payable {
        purchase();
    }

    function finalize() public onlyOwner notFinalized {
        require(endDate < now);
        finalized = true;

        emit TokensaleFinalized(currentRound, collected);
    }

    function withdrawRemains() public onlyOwner isFinalized {
        require(currentRound > 4); // if the tokens were not sold during 5 rounds
        token.safeTransfer(msg.sender, token.balanceOf(this));
    }

    // Internal functions
    function purchase() internal isAcceptableAmount(msg.value) isSaleActive notFinalized {
        uint256 contribution = msg.value;
        uint256 toBuy = contribution.mul(rate);
        uint256 allowedToBuy = toBuy;

        if (collected.add(allowedToBuy) > tokenSaleCap) {
            allowedToBuy = tokenSaleCap.sub(collected);
            require(allowedToBuy > rate);

            contribution = allowedToBuy.div(rate);
            allowedToBuy = contribution.mul(rate);
            msg.sender.transfer(msg.value.sub(contribution));
        }

        owner.transfer(contribution);
        token.safeTransfer(msg.sender, allowedToBuy);
        collected = collected.add(allowedToBuy);

        emit NewContribution(msg.sender, allowedToBuy);
    }
}
