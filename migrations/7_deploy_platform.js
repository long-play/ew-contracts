const EWillEscrow = artifacts.require("./EWillEscrow.sol");
const EWillFinance = artifacts.require("./EWillFinance.sol");
const EWillPlatform = artifacts.require("./EWillPlatform.sol");

module.exports = function(deployer, network, accounts) {
  if (network == 'test' || network == 'staging' || network == 'alpha') {
  }
  else {
    throw new Error('not implemented');
  }

  deployer.then( async () => {
    const escrow = await EWillEscrow.deployed();
    const finance = await EWillFinance.deployed();

    await deployer.deploy(EWillPlatform, finance.address, escrow.address);

    finance.setPlatform(EWillPlatform.address);
  });
};
