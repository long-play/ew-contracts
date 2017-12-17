const EWillEscrow = artifacts.require("./EWillEscrow.sol");
const EWillAccount = artifacts.require("./EWillAccount.sol");
const EWillPlatform = artifacts.require("./EWillPlatform.sol");

module.exports = async function(deployer, network) {
  if (network == 'development') {
    const escrow = await deployer.deploy(EWillEscrow);
    const account = await deployer.deploy(EWillAccount);
    const platform = await deployer.deploy(EWillPlatform);
  }
  else {
    throw Error('not implemented');
  }
};
