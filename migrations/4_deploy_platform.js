const EWillEscrow = artifacts.require("./EWillEscrow.sol");
const EWillAccount = artifacts.require("./EWillAccount.sol");
const EWillPlatform = artifacts.require("./EWillPlatform.sol");

module.exports = async function(deployer, network) {
  if (network == 'test' || network == 'staging') {
    const escrow = await deployer.deploy(EWillEscrow, 100); // 100 ethers
    const account = await deployer.deploy(EWillAccount);
    const platform = await deployer.deploy(EWillPlatform, 0.05e18, account, escrow); // 0.05 ethers
  }
  else {
    throw new Error('not implemented');
  }
};
