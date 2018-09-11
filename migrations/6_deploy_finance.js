const EWillToken = artifacts.require("./EWillToken.sol");
const EWillEscrow = artifacts.require("./EWillEscrow.sol");
const EWillAccount = artifacts.require("./EWillAccount.sol");
const EWillFinance = artifacts.require("./EWillFinance.sol");

module.exports = function(deployer, network, accounts) {
  let annualFee = 0; // in cents
  let rateToken = 0; // in weis per cent
  let rateEther = 0; // in weis per cent

  if (network == 'test') {
    annualFee = 1000;       // $10
    rateToken = 4.0e+15;    // $2.50
    rateEther = 2.0e+13;    // $500
  } else if (network == 'staging') {
    annualFee = 2300;       // $23
    rateToken = 5.0e+15;    // $2
    rateEther = 4.0e+13;    // $250
  } else if (network == 'alpha') {
    annualFee = 5400;       // $54
    rateToken = 5.0e+15;    // $2
    rateEther = 4.0e+13;    // $250
  } else {
    throw new Error('not implemented');
  }

  deployer.then( async () => {
    const token = await EWillToken.deployed();
    const escrow = await EWillEscrow.deployed();
    const account = await EWillAccount.deployed();

    await deployer.deploy(EWillFinance, annualFee, account.address, escrow.address, token.address);

    const finance = await EWillFinance.deployed();
    await token.addMerchant(finance.address);
    await escrow.setFinance(finance.address);
    await account.setFinance(finance.address);
    await finance.setExchangeRates(rateToken, rateEther);
  });
};
