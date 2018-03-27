const EWillAccount = artifacts.require("./EWillAccount.sol");

module.exports = async function(deployer, network, accounts) {
  let minParkingAmount = 0;
  let accounter = '0x0';

  if (network == 'test' || network == 'staging') {
    minParkingAmount = 1000; // ethers
    accounter = accounts[0];
  }
  else {
    throw new Error('not implemented');
  }

  await deployer.deploy(EWillAccount, minParkingAmount, accounter);
};
