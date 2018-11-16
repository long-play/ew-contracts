const EWillToken = artifacts.require("./EWillToken.sol");
const EWillEscrow = artifacts.require("./EWillEscrow.sol");

module.exports = function(deployer, network, [owner, tech]) {
  let minDepositAmount = 0;
  let defaultAnnualFee = 0;
  let defaultServiceInfoId = '0x0';
  let defaultServiceAddress = '0x0';
  let defaultServiceDelegate = '0x0';

  if (network == 'test') {
    minDepositAmount = 100; // EWILL tokens
    defaultAnnualFee = 1500; // 1500 cents == $15.00
    defaultServiceAddress = owner;
    defaultServiceDelegate = tech;
    defaultServiceInfoId = '0x28e9392bcff01ac30b788cdd176f3c63da08d258816b341d85c47dbfff53557f';
  } else if (network == 'staging') {
    minDepositAmount = 1000; // EWILL tokens
    defaultAnnualFee = 3700; // 3700 cents == $37.00
    defaultServiceAddress = owner;
    defaultServiceDelegate = tech;
    defaultServiceInfoId = '0x28e9392bcff01ac30b788cdd176f3c63da08d258816b341d85c47dbfff53557f';
  } else if (network == 'alpha') {
    minDepositAmount = 100000; // EWILL tokens
    defaultAnnualFee = 4500; // 4500 cents == $45.00
    defaultServiceAddress = owner;
    defaultServiceDelegate = tech;
    defaultServiceInfoId = '0xaf1fcd86e41ad2ef6cfe55c73b01e11bc95d61186d1f383f80250466d4491d23';
  } else {
    throw new Error('not implemented');
  }

  deployer.then( async () => {
    await deployer.deploy(EWillEscrow, EWillToken.address, minDepositAmount);
    const escrow = await EWillEscrow.deployed();
    const token = await EWillToken.deployed();
    await token.addMerchant(escrow.address);
    await escrow.register(defaultAnnualFee, defaultServiceInfoId, defaultServiceDelegate);
    await escrow.activateProvider(defaultServiceAddress, 2 /* Whitelisted */);
  });

};
