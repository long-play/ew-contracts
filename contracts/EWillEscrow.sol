pragma solidity ^0.4.18;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import './EWillEscrowIf.sol';


contract EWillEscrow is EWillEscrowIf, Ownable {
    // Custom Types
    struct Provider {
        uint256     fund;
        uint256     info;
        uint256     registeredAt;
    }

    // Constants
    string constant public name = 'E-Will Escrow';

    // State Variables
    uint256 public minProviderFund; // the minimum provider's fund in weis

    mapping (address => Provider) public providers;
    mapping (address => bool) public whitelisted;

    // Events
    event Registered(address provider, uint256 amount);
    event Withdrew(address provider, uint256 amount);

    // Modifiers
    modifier sufficientFund(address _provider, uint256 _fund) {
        require(minFundForProvider(_provider) <= _fund);
        _;
    }

    // Constructor
    function EWillEscrow(uint256 _minFund) public {
        minProviderFund = _minFund * 1 ether;
    }

    // Configuration
    function setMinFund(uint256 _minFund) public onlyOwner {
        minProviderFund = _minFund * 1 ether;
    }

    function addWhitelistedProvider(address _provider) public onlyOwner {
        whitelisted[_provider] = true;
    }

    function removeWhitelistedProvider(address _provider) public onlyOwner {
        whitelisted[_provider] = false;
    }

    function updateProviderInfo(uint256 _newInfoId) public {
        require(providers[msg.sender].registeredAt != 0);
        require(isProviderValid(msg.sender));

        providers[msg.sender].info = _newInfoId;
    }

    // Finance
    function minFundForProvider(address _provider) public constant returns (uint256) {
        return whitelisted[_provider] ? 0 : minProviderFund;
    }

    // Escrow
    function register(uint256 _infoId) public payable sufficientFund(msg.sender, msg.value) {
        require(providers[msg.sender].registeredAt == 0);

        providers[msg.sender] = Provider({
            fund: msg.value,
            info: _infoId,
            registeredAt: now
        });

        Registered(msg.sender, msg.value);
    }

    function topup() public payable {
        require(providers[msg.sender].registeredAt != 0);
        providers[msg.sender].fund += msg.value;

        Funded(0, msg.sender, msg.value);
    }

    function withdraw(uint256 _amount) public {
        uint256 remain = providers[msg.sender].fund - _amount;
        require(minFundForProvider(msg.sender) <= remain);

        providers[msg.sender].fund = remain;
        msg.sender.transfer(_amount);
        Withdrew(msg.sender, _amount);
    }

    // EWillEscrowIf
    function fund(uint256 _willId, address _provider) public payable {
        providers[_provider].fund += msg.value;
        Funded(_willId, _provider, msg.value);
    }

    function isProviderValid(address _provider) constant public returns (bool) {
        return minFundForProvider(_provider) <= providers[_provider].fund;
    }
}
