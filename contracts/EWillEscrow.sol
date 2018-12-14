pragma solidity ^0.4.24;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/token/ERC20/SafeERC20.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import './EWillEscrowIf.sol';
import './EWillTokenIf.sol';


contract EWillEscrow is EWillEscrowIf, Ownable {
    using SafeMath for uint256;
    using SafeERC20 for EWillTokenIf;

    // Custom Types
    struct Provider {
        uint256         annualFee;
        uint256         fund;
        uint256         info;
        address         delegate;
        ProviderState   state;
    }

    // Constants
    string constant public name = 'E-will Escrow';

    // State Variables
    uint256 public minProviderFund; // the minimum provider's fund in tokens
    address public financeContract; // Finance Contract address
    EWillTokenIf public token;      // token interface

    mapping (address => Provider) public providers;
    mapping (address => address) public delegates;

    // Events
    event Registered(address provider);
    event Activated(address provider, ProviderState newState);
    event Banned(address provider);
    event UpdatedDelegate(address provider, address delegate);
    event Withdrew(address provider, uint256 amount);
    event Fined(address provider, address victim, uint256 amount);

    // Modifiers
    modifier onlyFinance {
        require(msg.sender == financeContract);
        _;
    }

    // Constructor
    constructor(address _token, uint256 _minFund) public {
        token = EWillTokenIf(_token);
        minProviderFund = _minFund * 1 ether;
    }

    // Configuration
    function setFinance(address _financeContract) public onlyOwner {
        financeContract = _financeContract;
    }

    function setMinFund(uint256 _minFund) public onlyOwner {
        minProviderFund = _minFund * 1 ether;
    }

    function activateProvider(address _provider, ProviderState _state) public onlyOwner {
        require(isActiveState(_state) == true);
        require(providers[_provider].state == ProviderState.Pending);

        providers[_provider].state = _state;
        emit Activated(_provider, _state);
    }

    function updateProviderInfo(uint256 _annualFee, uint256 _newInfoId) public {
        require(isProviderValid(msg.sender) == true);

        providers[msg.sender].annualFee = _annualFee;
        providers[msg.sender].info = _newInfoId;
    }

    // Finance
    function minFundForProvider(address _provider) public view returns (uint256) {
        return providers[_provider].state == ProviderState.Whitelisted ? 0 : minProviderFund;
    }

    // Escrow
    function register(uint256 _annualFee, uint256 _infoId, address _delegate) public {
        require(providers[msg.sender].state == ProviderState.None);
        require(_delegate != 0);
        require(_delegate != msg.sender);

        providers[msg.sender] = Provider({
            annualFee: _annualFee,
            fund: 0,
            info: _infoId,
            delegate: _delegate,
            state: ProviderState.Pending
        });
        delegates[_delegate] = msg.sender;

        emit Registered(msg.sender);
    }

    function changeDelegate(address _delegate) public {
        require(_delegate != 0);
        require(_delegate != msg.sender);
        require(isActiveState(providers[msg.sender].state) == true);

        delete delegates[providers[msg.sender].delegate];
        providers[msg.sender].delegate = _delegate;
        delegates[_delegate] = msg.sender;

        emit UpdatedDelegate(msg.sender, _delegate);
    }

    function topup(uint256 _amount) public {
        require(isActiveState(providers[msg.sender].state) == true);

        token.charge(msg.sender, _amount, bytes32('escrow_deposit_topup'));
        providers[msg.sender].fund = providers[msg.sender].fund.add(_amount);

        emit Funded(msg.sender, _amount, 0);
    }

    function withdraw(uint256 _amount) public {
        uint256 remain = providers[msg.sender].fund.sub(_amount);
        require(minFundForProvider(msg.sender) <= remain);
        require(isProviderValid(msg.sender) == true);

        providers[msg.sender].fund = remain;
        token.safeTransfer(msg.sender, _amount);

        emit Withdrew(msg.sender, _amount);
    }

    // Arbitrage
    //todo: replace owner with arbitrer
    function penalizeProvider(address _provider, address _victim, uint256 _fine) public onlyOwner {
        providers[_provider].fund = providers[_provider].fund.sub(2 * _fine);
        token.safeTransfer(_victim, _fine);
        token.safeTransfer(financeContract, _fine); //todo: is it right?
        emit Fined(_provider, _victim, _fine);
    }

    function banProvider(address _provider) public onlyOwner {
        require(isActiveState(providers[_provider].state) == true);

        providers[_provider].state = ProviderState.Banned;
        emit Banned(_provider);
    }

    function unbanProvider(address _provider) public onlyOwner {
        require(providers[_provider].state == ProviderState.Banned);

        providers[_provider].state = ProviderState.Activated;
        emit Activated(_provider, ProviderState.Activated);
    }

    // EWillEscrowIf
    function fund(address _provider, uint256 _amount, uint256 _willId) public onlyFinance {
        providers[_provider].fund = providers[_provider].fund.add(_amount);
        emit Funded(_provider, _amount, _willId);
    }

    function refund(address _customer, uint256 _amount, uint256 _willId) public onlyFinance {
        token.safeTransfer(_customer, _amount);
        emit Refunded(_customer, _amount, _willId);
    }

    function isProviderValid(address _provider) view public returns (bool) {
        return isActiveState(providers[_provider].state) && minFundForProvider(_provider) <= providers[_provider].fund;
    }

    function providerAddress(address _delegate) view public returns (address) {
        return delegates[_delegate];
    }

    function providerInfo(address _provider) view public returns (uint256 annualFee, uint256 info, address delegate, ProviderState state) {
        Provider storage provider = providers[_provider];
        annualFee = provider.annualFee;
        info = provider.info;
        delegate = provider.delegate;
        state = provider.state;
    }

    // Internal
    function isActiveState(ProviderState _state) pure internal returns (bool) {
        return _state == ProviderState.Whitelisted || _state == ProviderState.Activated;
    }
}
