const EWillPreTokensale = artifacts.require("./EWillPreTokensale.sol");
const EWillEscrow = artifacts.require("./EWillEscrow.sol");

module.exports = function(deployer, network, accounts) {
  let minDepositAmount = 0;
  let defaultAnnualFee = 0;
  let defaultServiceInfoId = '0x0';
  let defaultServiceAddress = '0x0';
  let defaultServiceDelegate = '0x0';

  if (network == 'test' || network == 'staging') {
    minDepositAmount = 100; // ethers
    defaultAnnualFee = 1500; // 1500 cents == $15
    defaultServiceAddress = accounts[0];
    defaultServiceDelegate = '0xdeadbeaf';
    defaultServiceInfoId = '0x97f7bf3b6105d5aff5add3636756274b58bb80d8e2ddf9b98334380c39613649';
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
