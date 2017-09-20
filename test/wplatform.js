var WPlatform = artifacts.require("WPlatform");

//todo: move to separate utils file
//const TestUtils = require('./TestUtils.js');
TestUtils = {};
TestUtils.findEvent = (logs, eventName) => {
  let result = null;
  for (let idx = 0; idx < logs.length; idx++) {
    const log = logs[idx];
    if (log.event === eventName) {
      result = log;
      break;
    }
  }
  return result;
};

contract('WPlatform', function(accounts) {
  const admin = accounts[0];
  const user  = accounts[1];
  const prov  = accounts[2];

  const willId = 0x31111d;
  const WillState = {
    None: 0,
    Created: 1,
    Activated: 2,
    Claimed: 3,
    Declined: 4
  };

  let wpContract = null;

  it("should have a correct name", async () => {
    wpContract = await WPlatform.deployed();
    assert.equal(await wpContract.name.call(), 'WPlatform', 'the contract has the wrong name');
  });

  it("should configure the contract", async () => {
    txResult = await wpContract.setAnnaulPlatformFee(1, { from: admin });
    txResult = await wpContract.setEthRate(1, { from: admin });
    txResult = await wpContract.setAnnaulProviderFee(1, { from: prov });

    assert.equal(await wpContract.annualPlatformFee.call(), 'WPlatform', 'the contract has the wrong Annual Platform Fee');
    assert.equal(await wpContract.weiRate.call(), 'WPlatform', 'the contract has the wrong Ethereum Rate');
    assert.equal(await wpContract.annualProviderFee.call(), 'WPlatform', 'the contract has the wrong Annual Provider Fee');
  });

  it("should create a will", async () => {
    let txResult, txEvent;

    txResult = await wpContract.createWill(willId, 0x5108a9e, prov, { from: user, value: 2.0e+3 });
    txEvent = TestUtils.findEvent(txResult.logs, 'WillCreated');
    assert.equal(txEvent.args.willId, willId, 'the will is created with the wrong ID');
    assert.equal(txEvent.args.owner, user, 'the will is created for the wrong user');
    assert.equal(txEvent.args.provider, prov, 'the will is created for the wrong provider');

    txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
    assert.equal(txEvent.args.willId, willId, 'the will is created with the wrong ID');
    assert.equal(txEvent.args.owner, user, 'the will is created for the wrong user');
    assert.equal(txEvent.args.newState, WillState.Created, 'the will is created with the wrong state');
  });

  it("should activate the will", async () => {
    let txResult, txEvent;

    txResult = await wpContract.activateWill(willId, { from: prov });
    txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
    assert.equal(txEvent.args.willId, willId, 'the will is created with the wrong ID');
    assert.equal(txEvent.args.owner, user, 'the will is created for the wrong user');
    assert.equal(txEvent.args.newState, WillState.Activated, 'the will is activated with the wrong state');
  });

  it("should apply the will", async () => {
    let txResult, txEvent;

    txResult = await wpContract.applyWill(willId, 0xe4c6, { from: prov });
    txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
    assert.equal(txEvent.args.willId, willId, 'the will is created with the wrong ID');
    assert.equal(txEvent.args.owner, user, 'the will is created for the wrong user');
    assert.equal(txEvent.args.newState, WillState.Pending, 'the will is applied with the wrong state');
  });

  it("should claim the will", async () => {
    let txResult, txEvent;

    txResult = await wpContract.claimWill(willId, { from: prov });
    txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
    assert.equal(txEvent.args.willId, willId, 'the will is created with the wrong ID');
    assert.equal(txEvent.args.owner, user, 'the will is created for the wrong user');
    assert.equal(txEvent.args.newState, WillState.Claimed, 'the will is claimed with the wrong state');
  });
});
