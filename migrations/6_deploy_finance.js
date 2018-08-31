const EWillPreTokensale = artifacts.require("./EWillPreTokensale.sol");
const EWillToken = artifacts.require("./EWillToken.sol");
const EWillEscrow = artifacts.require("./EWillEscrow.sol");
const EWillAccount = artifacts.require("./EWillAccount.sol");
const EWillFinance = artifacts.require("./EWillFinance.sol");

module.exports = function(deployer, network, accounts) {
  let annualFee = 0;

  if (network == 'test' || network == 'staging') {
    annualFee = 1000; // $10 (1000 cents)
  }
  else {
    throw new Error('not implemented');
  }

  deployer.then( async () => {
    const escrow = await EWillEscrow.deployed();
    const account = await EWillAccount.deployed();
    const preTokensale = await EWillPreTokensale.deployed();
    const token = EWillToken.at(await preTokensale.token.call());

    await deployer.deploy(EWillFinance, annualFee, account.address, escrow.address, token.address);

    const finance = await EWillFinance.deployed();
    await escrow.setFinance(finance.address);
    await account.setFinance(finance.address);
    await token.addMerchant(finance.address);
  });
};
