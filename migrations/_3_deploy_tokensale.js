const EWillTokensale = artifacts.require("./EWillTokensale.sol");
const EWillPreTokensale = artifacts.require("./EWillPreTokensale.sol");

module.exports = function(deployer, network) {
  if (network == 'test' || network == 'staging') {
    throw new Error('not implemented');
  }
  else {
    throw new Error('not implemented');
  }
};
