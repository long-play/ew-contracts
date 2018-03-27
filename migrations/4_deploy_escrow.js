const EWillEscrow = artifacts.require("./EWillEscrow.sol");

module.exports = async function(deployer, network, accounts) {
  let minDepositAmount = 0;
  let defaultServiceInfoId = '0x0';
  let defaultServiceAddress = '0x0';
  let defaultServiceDelegate = '0x0';

  if (network == 'test' || network == 'staging') {
    minDepositAmount = 100; // ethers
    defaultServiceAddress = accounts[0];
    defaultServiceInfoId = '0x97f7bf3b6105d5aff5add3636756274b58bb80d8e2ddf9b98334380c39613649';
  }
  else {
    throw new Error('not implemented');
  }

  await deployer.deploy(EWillEscrow, minDepositAmount);
  const escrow = await EWillEscrow.deployed();
  await escrow.addWhitelistedProvider(defaultServiceAddress);
  await escrow.register(defaultServiceInfoId, defaultServiceDelegate);
};
