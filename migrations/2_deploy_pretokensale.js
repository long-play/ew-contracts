const EWillPreTokensale = artifacts.require("./EWillPreTokensale.sol");

module.exports = function(deployer) {
  const now = Date.now() / 1000;
  deployer.deploy(EWillPreTokensale, 10, now + 10, now + 1000);
};
