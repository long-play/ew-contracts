const BN = require('bn.js');
const EWillToken = artifacts.require("./EWillToken.sol");
const EWillEscrow = artifacts.require("./EWillEscrow.sol");
const EWillFinance = artifacts.require("./EWillFinance.sol");
const EWillPlatform = artifacts.require("./EWillPlatform.sol");

module.exports = function(deployer, network, [owner]) {
  const distribution = {
    team:        { address: owner, value: 25 },
    company:     { address: owner, value: 5 },
    bizdev:      { address: owner, value: 13 },
    contingency: { address: owner, value: 2 },
    advisors:    { address: owner, value: 3 },
    bounty:      { address: owner, value: 5 },
    privatesale: { address: owner, value: 7 },
    tokensale:   { address: owner, value: 40 },
  };

  deployer.then( async () => {
    if (network == 'test') {
    } else if (network == 'staging') {
      distribution.company.address = EWillFinance.address;
    } else if (network == 'alpha') {
      distribution.company.address = EWillFinance.address;
    } else {
      throw new Error('not implemented');
    }

    const token = await EWillToken.deployed();
    const total = new BN((await token.totalSupply.call()).toString(16), 'hex');

    for (let idx in distribution) {
      const distr = distribution[idx];
      token.transfer(distr.address, total.muln(distr.value).divn(100).toString());
    }
  });
};
