const EWillEscrow = artifacts.require("./EWillEscrow.sol");
const EWillAccount = artifacts.require("./EWillAccount.sol");
const EWillPlatform = artifacts.require("./EWillPlatform.sol");
const EWillPreTokensale = artifacts.require("./EWillPreTokensale.sol");

module.exports = async function(deployer, network, accounts) {
  let annualFee = 0;

  if (network == 'test' || network == 'staging') {
    annualFee = 0.05e+18; // 0.05 ethers
  }
  else {
    throw new Error('not implemented');
  }

  const preTokensale = await EWillPreTokensale.deployed();
  const tokenAddress = await preTokensale.token.call();
  await deployer.deploy(EWillPlatform, annualFee, EWillAccount.address, EWillEscrow.address, tokenAddress);
};
