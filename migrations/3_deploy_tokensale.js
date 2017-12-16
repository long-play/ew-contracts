const EWillTokensale = artifacts.require("./EWillTokensale.sol");
const EWillPreTokensale = artifacts.require("./EWillPreTokensale.sol");

module.exports = function(deployer, network) {
  if (network == 'development') {
    ;
  }
  else {
    throw Error('not implemented');
  }
};
