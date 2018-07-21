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
    enum ProviderState { None, Pending, Whitelisted, Activated, Banned }

    struct Provider {
        uint256         fund;
        uint256         info;
        address         delegate;
        ProviderState   state;
    }

    // Constants
    string constant public name = 'E-Will Escrow';

    // State Variables
    uint256 public minProviderFund; // the minimum provider's fund in tokens
    address public platform;        // platform address
    EWillTokenIf public token;      // token interface

    mapping (address => Provider) public providers;
    mapping (address => address) public delegates;

    // Events
    event Registered(address provider);
    event Activated(address provider, ProviderState newState);
    event Banned(address provider);
    event UpdatedDelegate(address provider, address delegate);
    event Withdrew(address provider, uint256 amount);

    // Modifiers
    modifier onlyPlatform {
        require(msg.sender == platform);
        _;
    }

    // Constructor
    constructor(address _token, uint256 _minFund) public {
        token = EWillTokenIf(_token);
        minProviderFund = _minFund * 1 ether;
    }

    // Configuration
    function setPlatform(address _platform) public onlyOwner {
        //???require(platform == 0x0);
        platform = _platform;
    }

    function setMinFund(uint256 _minFund) public onlyOwner {
        minProviderFund = _minFund * 1 ether;
    }

    function activateProvider(address _provider, ProviderState _state) public onlyOwner {
        require(isActiveState(_state));
        require(providers[_provider].state == ProviderState.Pending);

        providers[_provider].state = _state;
        emit Activated(_provider, _state);
    }

    function banProvider(address _provider) public onlyOwner {
        require(isActiveState(providers[_provider].state));

        providers[_provider].state = ProviderState.Banned;
        emit Banned(_provider);
    }

    function updateProviderInfo(uint256 _newInfoId) public {
        require(isProviderValid(msg.sender));

        providers[msg.sender].info = _newInfoId;
    }

    // Finance
    function minFundForProvider(address _provider) public view returns (uint256) {
        return providers[_provider].state == ProviderState.Whitelisted ? 0 : minProviderFund;
    }

    // Escrow
    function register(uint256 _infoId, address _delegate) public {
        require(providers[msg.sender].state == ProviderState.None);
        require(_delegate != 0);
        require(_delegate != msg.sender);

        providers[msg.sender] = Provider({
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

        delete delegates[providers[msg.sender].delegate];
        providers[msg.sender].delegate = _delegate;
        delegates[_delegate] = msg.sender;

        emit UpdatedDelegate(msg.sender, _delegate);
    }

    function topup(uint256 _amount) public {
        require(isActiveState(providers[msg.sender].state));

        token.charge(msg.sender, _amount, bytes32('escrow_deposit_topup'));
        providers[msg.sender].fund = providers[msg.sender].fund.add(_amount);

        emit Funded(0, msg.sender, _amount);
    }

    function withdraw(uint256 _amount) public {
        uint256 remain = providers[msg.sender].fund.sub(_amount);
        require(minFundForProvider(msg.sender) <= remain);

        providers[msg.sender].fund = remain;
        token.safeTransfer(msg.sender, _amount);

        emit Withdrew(msg.sender, _amount);
    }

    // EWillEscrowIf
    function fund(uint256 _willId, address _provider, uint256 _amount) public onlyPlatform {
        //todo: require(isProviderValid(_provider) == true);
        providers[_provider].fund = providers[_provider].fund.add(_amount);
        emit Funded(_willId, _provider, _amount);
    }

    function isProviderValid(address _provider) view public returns (bool) {
        return isActiveState(providers[_provider].state) && minFundForProvider(_provider) <= providers[_provider].fund;
    }

    function providerAddress(address _delegate) view public returns (address) {
        return delegates[_delegate];
    }

    // Internal
    function isActiveState(ProviderState _state) pure internal returns (bool) {
        return _state == ProviderState.Whitelisted || _state == ProviderState.Activated;
    }
}
