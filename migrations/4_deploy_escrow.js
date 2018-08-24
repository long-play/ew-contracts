const EWillPreTokensale = artifacts.require("./EWillPreTokensale.sol");
const EWillEscrow = artifacts.require("./EWillEscrow.sol");

module.exports = function(deployer, network, [owner, tech]) {
  let minDepositAmount = 0;
  let defaultAnnualFee = 0;
  let defaultServiceInfoId = '0x0';
  let defaultServiceAddress = '0x0';
  let defaultServiceDelegate = '0x0';

  if (network == 'test' || network == 'staging') {
    minDepositAmount = 100; // EWILL tokens
    defaultAnnualFee = 1500; // 1500 cents == $15.00
    defaultServiceAddress = owner;
    defaultServiceDelegate = tech;
    defaultServiceInfoId = '0x28e9392bcff01ac30b788cdd176f3c63da08d258816b341d85c47dbfff53557f';
  }
  else {
    throw new Error('not implemented');
  }

  deployer.then( async () => {
    const preTokensale = await EWillPreTokensale.deployed();
    const tokenAddress = await preTokensale.token.call();

    await deployer.deploy(EWillEscrow, tokenAddress, minDepositAmount);
    const escrow = await EWillEscrow.deployed();
    await escrow.register(defaultAnnualFee, defaultServiceInfoId, defaultServiceDelegate);
    await escrow.activateProvider(defaultServiceAddress, 2 /* Whitelisted */);
  });

};
