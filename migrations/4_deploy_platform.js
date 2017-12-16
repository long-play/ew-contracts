const EWill = artifacts.require("./EWill.sol");
const EWillEscrow = artifacts.require("./EWillEscrow.sol");
const EWillAccount = artifacts.require("./EWillAccount.sol");

module.exports = function(deployer, network) {
  if (network == 'development') {
    ;
  }
  else {
    throw Error('not implemented');
  }
};
