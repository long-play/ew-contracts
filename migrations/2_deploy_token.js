const EWillToken = artifacts.require("./EWillToken.sol");

module.exports = function(deployer, network) {
  let TOTAL_SUPPLY = 0;

  if (network == 'test') {
    TOTAL_SUPPLY = 1000;
  } else if (network == 'staging') {
    TOTAL_SUPPLY = 100000;
  } else if (network == 'alpha') {
    TOTAL_SUPPLY = 10000000;
  } else {
    throw new Error('not implemented');
  }

  deployer.deploy(EWillToken, TOTAL_SUPPLY * 1.0e+18);
};
