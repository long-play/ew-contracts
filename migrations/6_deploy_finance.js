const EWillPreTokensale = artifacts.require("./EWillPreTokensale.sol");
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
    const tokenAddress = await preTokensale.token.call();

    await deployer.deploy(EWillFinance, annualFee, account.address, escrow.address, tokenAddress);

    const finance = await EWillFinance.deployed();
    await escrow.setFinance(finance.address);
    await account.setFinance(finance.address);
  });
};
