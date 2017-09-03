pragma solidity ^0.4.15;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';


contract WPlatform is Ownable {
  // Custom Types
  enum WillState { None, Created, Activated, Claimed, Declined }

  struct Will {
    uint256     willId;
    uint256     storageId;
    uint256     balance;
    uint256     annualFee;
    address     owner;
    WillState   state;
    uint        createdAt;
    uint        activatedAt;
    address     provider;
  }

  // Events
  event WillCreated(uint256 willId, address owner, address provider);
  event WillStateUpdated(uint256 willId, address owner, WillState newState);

  // State Variables
  string public name = 'WPlatform';

  uint256 public annualPlatformFee; // annual platform fee in dollars
  uint256 public weiRate;           // excchange rate weis per dollar
  mapping (address => uint256) public annualProviderFee;   // annual provider fee in dollars

  uint256 public platformFund;      // platform's balance in wei
  mapping (address => uint256) public providerBalance;     // provider's balance in wei

  mapping (uint256 => Will) wills;
  mapping (address => uint256[]) userWills;

  // Modifiers
  modifier onlyWillOwner(uint256 willId) {
    Will storage will = wills[willId];
    require(will.owner == msg.sender);
    _;
  }

  modifier onlyProvider(uint256 willId) {
    Will storage will = wills[willId];
    require(will.provider == msg.sender);
    _;
  }

  // Constructor
  function WPlatform() {
  }

  // Configuration
  function setAnnaulPlatformFee(uint256 _fee) onlyOwner {
    annualPlatformFee = _fee;
  }

  function setEthRate(uint256 _rate) onlyOwner {
    weiRate = _rate;
  }

  // Will
  function createWill(uint256 _storageId, uint256 _willId, address _provider) payable {
    require(wills[_willId].state == WillState.None);
    require(msg.value >= (annualPlatformFee + annualProviderFee[_provider] * 12 / 10) * weiRate);

    uint256 balance = msg.value - annualPlatformFee * weiRate;
    platformFund += annualPlatformFee * weiRate;

    wills[_willId] = Will({
      willId: _willId,
      storageId: _storageId,
      balance: balance,
      annualFee: annualProviderFee[_provider],
      owner: msg.sender,
      state: WillState.Created,
      createdAt: now,
      activatedAt: 0,
      provider: _provider
    });
    userWills[msg.sender].push(_willId);

    WillCreated(_willId, msg.sender, _provider);
  }

  function activateWill(uint256 _willId) onlyProvider(_willId) {
    Will storage will = wills[_willId];
    require(will.state == WillState.Created);

    will.state = WillState.Activated;
    will.activatedAt = now;

    uint256 initialFee = will.annualFee / 10;
    will.balance -= initialFee;
    providerBalance[msg.sender] += initialFee;

    WillStateUpdated(will.willId, will.owner, will.state);
  }
}
