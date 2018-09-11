const EWillToken = artifacts.require("./EWillToken.sol");
const EWillAccount = artifacts.require("./EWillAccount.sol");

module.exports = function(deployer, network, [owner, tech]) {
  let minParkingAmount = 1000000000; //more than the total supply. Not to allow
  let accounter = '0x0';

  if (network == 'test') {
    accounter = tech;
  } else if (network == 'staging') {
    accounter = tech;
  } else if (network == 'alpha') {
    accounter = tech;
  } else {
    throw new Error('not implemented');
  }

  deployer.then( async () => {
    await deployer.deploy(EWillAccount, EWillToken.address, minParkingAmount, accounter);
    const account = await EWillAccount.deployed();
  });
};
