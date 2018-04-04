const EWillPreTokensale = artifacts.require("./EWillPreTokensale.sol");
const EWillEscrow = artifacts.require("./EWillEscrow.sol");
const EWillAccount = artifacts.require("./EWillAccount.sol");
const EWillPlatform = artifacts.require("./EWillPlatform.sol");

module.exports = function(deployer, network, accounts) {
  let annualFee = 0;

  if (network == 'test' || network == 'staging') {
    annualFee = 0.05e+18; // 0.05 ethers
  }
  else {
    throw new Error('not implemented');
  }

  deployer.then( async () => {
    const escrow = await EWillEscrow.deployed();
    const account = await EWillAccount.deployed();
    const preTokensale = await EWillPreTokensale.deployed();
    const tokenAddress = await preTokensale.token.call();

    await deployer.deploy(EWillPlatform, annualFee, account.address, escrow.address, tokenAddress);

    const platform = await EWillPlatform.deployed();
    await escrow.setPlatform(platform.address);
    await account.setPlatform(platform.address);
  });
};
