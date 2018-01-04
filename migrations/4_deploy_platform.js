const EWillEscrow = artifacts.require("./EWillEscrow.sol");
const EWillAccount = artifacts.require("./EWillAccount.sol");
const EWillPlatform = artifacts.require("./EWillPlatform.sol");

module.exports = async function(deployer, network, accounts) {
  if (network == 'test' || network == 'staging') {
    await deployer.deploy(EWillEscrow, 100); // 100 ethers
    const escrow = EWillEscrow.address;
    await deployer.deploy(EWillAccount, 1000, accounts[0]); // 1000 EWILLs
    const account = EWillAccount.address;
    await deployer.deploy(EWillPlatform, 0.05e+18, account, escrow); // 0.05 ethers
  }
  else {
    throw new Error('not implemented');
  }
};
