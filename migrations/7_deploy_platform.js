const EWillEscrow = artifacts.require("./EWillEscrow.sol");
const EWillFinance = artifacts.require("./EWillFinance.sol");
const EWillPlatform = artifacts.require("./EWillPlatform.sol");

module.exports = function(deployer, network, accounts) {
  let platformAddress = '0x0';
  if (network == 'test' || network == 'staging' || network == 'alpha') {
    platformAddress = '0x35ebc51e8dfcb439082514471eb9cd7c66d2e86e';
  }
  else {
    throw new Error('not implemented');
  }

  deployer.then( async () => {
    const escrow = await EWillEscrow.deployed();
    const finance = await EWillFinance.deployed();

    await deployer.deploy(EWillPlatform, finance.address, escrow.address, platformAddress);

    finance.setPlatform(EWillPlatform.address);
  });
};
