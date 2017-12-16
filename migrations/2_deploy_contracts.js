var EWillToken = artifacts.require("./EWillToken.sol");

module.exports = function(deployer) {
  deployer.deploy(EWillToken);
};
