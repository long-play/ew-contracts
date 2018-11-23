const EWillToken = artifacts.require("./EWillToken.sol");
const EWillFinance = artifacts.require("./EWillFinance.sol");
const EWillMarketing = artifacts.require("./EWillMarketing.sol");

module.exports = function(deployer, network, [owner, tech]) {
  let defaultMarketer = '0x0';

  if (network == 'test') {
    defaultMarketer = tech;
  } else if (network == 'staging') {
    defaultMarketer = tech;
  } else if (network == 'alpha') {
    defaultMarketer = tech;
  } else {
    throw new Error('not implemented');
  }

  deployer.then( async () => {
    const finance = await EWillFinance.deployed();
    await deployer.deploy(EWillMarketing, EWillFinance.address, defaultMarketer, EWillToken.address);
    finance.setMarketing(EWillMarketing.address);
  });

};
