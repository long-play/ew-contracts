pragma solidity ^0.4.24;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/token/ERC20/SafeERC20.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import './EWillAccountIf.sol';
import './EWillTokenIf.sol';


contract EWillAccount is EWillAccountIf, Ownable {
    using SafeMath for uint256;
    using SafeERC20 for EWillTokenIf;

    // Custom Types
    struct TokenHolder {
        uint256     amount;
        uint256     rewardedAt;
        bool        verified;
    }

    // Constants
    string constant public name = 'E-will Account';

    // State Variables
    uint256 public income;                          // the income of the Finance Contract
    uint256 public lastPayout;                      // the last time the payout happened at
    uint256 public minParkingAmount;                // min amount of tokens for parking
    uint256 public parkedFund;                      // amount of parked tokens

    uint256 lastPayoutBlockNumber;                  // the last block the payout happened at
    uint256 rewardPaid;                             // paid reward in the current payout
    uint256 rewardToDistribute;                     // reward to pay in the current payout
    uint256 parkedFundCap;                          // amount of parked tokens at the beginning of the current payout

    address public accounter;                       // the address for operational expenses
    address public financeContract;                 // Finance Contract address
    EWillTokenIf public token;                      // token interface
    mapping (address => TokenHolder) tokenHolders;  // registered token holders

    // Events
    event Parked(address holder, uint256 amount);
    event Unparked(address holder, uint256 amount);
    event Rewarded(address holder, uint256 amount);
    event Withdrew(uint256 amount);

    // Modifiers
    modifier onlyFinance {
        require(msg.sender == financeContract);
        _;
    }

    modifier onlyVerifiedHolders() {
        require(tokenHolders[msg.sender].verified == true);
        _;
    }

    // Constructor
    constructor(address _token, uint256 _minParkingAmount, address _accounter) public {
        token = EWillTokenIf(_token);
        minParkingAmount = _minParkingAmount * 1 ether;
        accounter = _accounter;
        lastPayout = 0;
        income = 0;
    }

    // Configuration
    function setFinance(address _financeContract) public onlyOwner {
        require(financeContract == 0x0);
        financeContract = _financeContract;
    }

    function setAccounter(address _accounter) public onlyOwner {
        accounter = _accounter;
    }

    function setMinParkingAmount(uint256 _minParkingAmount) public onlyOwner {
        minParkingAmount = _minParkingAmount * 1 ether;
    }

    // KYC
    function verifyTokenHolder(address _tokenHolder) public onlyOwner {
        require(tokenHolders[_tokenHolder].verified == false);
        tokenHolders[_tokenHolder] = TokenHolder({
            amount: 0,
            rewardedAt: block.number,
            verified: true
        });
    }

    function unverifyTokenHolder(address _tokenHolder) public onlyOwner {
        if (tokenHolders[_tokenHolder].amount > 0) {
            token.safeTransfer(_tokenHolder, tokenHolders[_tokenHolder].amount);
        }
        delete tokenHolders[_tokenHolder];
    }

    // Accounting
    function payOperationalExpenses(uint256 _amount) public onlyOwner {
        require(now - lastPayout >= 30 days); // don't allow to payout too often
        require(_amount <= income / 2);  // don't allow to withdraw more than a half of entire fund

        lastPayout = now;
        lastPayoutBlockNumber = block.number;
        rewardToDistribute = income.add(rewardToDistribute).sub(rewardPaid).sub(_amount);

        parkedFund = parkedFund.add(rewardPaid);
        parkedFundCap = parkedFund;
        rewardPaid = 0;
        income = 0;

        token.safeTransfer(accounter, _amount);
        emit Withdrew(_amount);
    }

    // Token parking
    function park(uint256 _amount) public onlyVerifiedHolders {
        require(_amount >= minParkingAmount);

        TokenHolder storage holder = tokenHolders[msg.sender];
        holder.amount = holder.amount.add(_amount);
        holder.rewardedAt = block.number;

        token.charge(msg.sender, _amount, bytes32('parking'));
        parkedFund = parkedFund.add(_amount);

        emit Parked(msg.sender, _amount);
    }

    function unpark() public onlyVerifiedHolders {
        TokenHolder storage holder = tokenHolders[msg.sender];
        uint256 amount = holder.amount;

        token.safeTransfer(msg.sender, amount);
        parkedFund = parkedFund.sub(amount);
        holder.amount = 0;

        emit Unparked(msg.sender, amount);
    }

    function getReward() public onlyVerifiedHolders {
        TokenHolder storage holder = tokenHolders[msg.sender];
        uint256 reward = holder.amount.mul(rewardToDistribute).div(parkedFundCap);

        require(holder.rewardedAt < lastPayoutBlockNumber);
        holder.rewardedAt = block.number;
        holder.amount = holder.amount.add(reward);
        rewardPaid = rewardPaid.add(reward);

        emit Rewarded(msg.sender, reward);
    }

    // EWillAccountIf
    function fund(uint256 _willId, uint256 _amount) public onlyFinance {
        income = income.add(_amount);
        emit Funded(_willId, _amount);
    }
}
