const EWillPreTokensale = artifacts.require("./EWillPreTokensale.sol");

module.exports = function(deployer, network) {
  const price = 10;
  let startDate = 0;
  let endDate = 0;

  if (network == 'test') {
    const now = Date.now() / 1000;
    startDate = now + 10;
    endDate = now + 100;
  } else if (network == 'staging') {
    const now = Date.now() / 1000;
    startDate = now + 100;
    endDate = now + 1000;
  } else {
    startDate = Date.parse('01/15/2018 15:15:15');
    endDate = Date.parse('02/15/2018 15:15:15');
    throw new Error('not implemented');
  }

  deployer.deploy(EWillPreTokensale, price, startDate, endDate);
};
