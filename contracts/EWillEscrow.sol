pragma solidity ^0.4.18;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import './EWillEscrowIf.sol';


contract EWillEscrow is EWillEscrowIf, Ownable {
    // Custom Types
    struct Provider {
        uint256     fund;
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

    // Modifiers
    modifier sufficientFund(address _provider, uint256 _fund) {
        require(_fund >= minProviderFund || whitelisted[_provider]);
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

    // Escrow
    function register() public payable sufficientFund(msg.sender, msg.value) {
        require(providers[msg.sender].registeredAt == 0);

        providers[msg.sender] = Provider({
            fund: msg.value,
            registeredAt: now
        });

        Registered(msg.sender, msg.value);
    }

    function topup() public payable {
        require(providers[msg.sender].registeredAt != 0);
        providers[msg.sender].fund += msg.value;

        Funded(0, msg.sender, msg.value);
    }

    // EWillEscrowIf
    function fund(uint256 _willId, address _provider) public payable {
        providers[_provider].fund += msg.value;
        Funded(_willId, _provider, msg.value);
    }

    function isProviderValid(address _provider) constant public sufficientFund(_provider, providers[_provider].fund) returns (bool) {
        return true;
    }
}
