const EWillPreTokensale = artifacts.require("./EWillPreTokensale.sol");
const EWillAccount = artifacts.require("./EWillAccount.sol");

module.exports = function(deployer, network, accounts) {
  let minParkingAmount = 0;
  let accounter = '0x0';

  if (network == 'test' || network == 'staging') {
    minParkingAmount = 1000; // tokens
    accounter = accounts[0];
  }
  else {
    throw new Error('not implemented');
  }

  deployer.then( async () => {
    const preTokensale = await EWillPreTokensale.deployed();
    const tokenAddress = await preTokensale.token.call();
    await deployer.deploy(EWillAccount, tokenAddress, minParkingAmount, accounter);
    const account = await EWillAccount.deployed();
  });
};
