const WPlatform = artifacts.require("WPlatform");
const keccak256 = require('js-sha3').keccak256;
const BN = require('bn.js');

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
  const benf  = accounts[3];

  const willId = (new BN(prov.slice(2), 16)).iushln(96).iadd(new BN(0x31111d, 16)).toString(10);

  const WillState = {
    None: 0,
    Created: 1,
    Activated: 2,
    Pending: 3,
    Claimed: 4,
    Declined: 5
  };

  let wpContract = null;

  it("should have a correct name", async () => {
    wpContract = await WPlatform.deployed();
    console.log(wpContract.address + ' / ' + user);
    assert.equal(await wpContract.name.call(), 'WPlatform', 'the contract has the wrong name');
  });

  it("should configure the contract", async () => {
    let txResult;
    txResult = await wpContract.setAnnaulPlatformFee(5, { from: admin });
    txResult = await wpContract.setAnnaulProviderFee(10, { from: prov });

    const annualPlatformFee = await wpContract.annualPlatformFee.call();
    const annualProviderFee = await wpContract.annualProviderFee.call(prov);
    assert.equal(annualPlatformFee.toString(), '5', 'the contract has the wrong Annual Platform Fee');
    assert.equal(annualProviderFee.toString(), '10', 'the contract has the wrong Annual Provider Fee');
  });

  it("should create a will", async () => {
    let txResult, txEvent;

    let benHash = (new BN(benf.slice(2), 16)).toBuffer();
    benHash = new BN(keccak256(benHash), 16);

    txResult = await wpContract.createWill(willId, 0x5108a9e, benHash.toString(10), prov, { from: user, value: 2.0e+3 });
    txEvent = TestUtils.findEvent(txResult.logs, 'WillCreated');
    assert.equal(txEvent.args.willId.toString(10).toString(10), willId, 'the will is created with the wrong ID');
    assert.equal(txEvent.args.owner, user, 'the will is created for the wrong user');
    assert.equal(txEvent.args.provider, prov, 'the will is created for the wrong provider');

    txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
    assert.equal(txEvent.args.willId.toString(10).toString(10), willId, 'the will is created with the wrong ID');
    assert.equal(txEvent.args.owner, user, 'the will is created for the wrong user');
    assert.equal(txEvent.args.newState, WillState.Created, 'the will is created with the wrong state');
  });

  it("should activate the will", async () => {
    let txResult, txEvent;

    txResult = await wpContract.activateWill(willId, { from: prov });
    txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
    assert.equal(txEvent.args.willId.toString(10), willId, 'the will is created with the wrong ID');
    assert.equal(txEvent.args.owner, user, 'the will is created for the wrong user');
    assert.equal(txEvent.args.newState, WillState.Activated, 'the will is activated with the wrong state');
  });

  it("should apply the will", async () => {
    let txResult, txEvent;

    txResult = await wpContract.applyWill(willId, 0xe4c6, { from: prov });
    txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
    assert.equal(txEvent.args.willId.toString(10), willId, 'the will is created with the wrong ID');
    assert.equal(txEvent.args.owner, user, 'the will is created for the wrong user');
    assert.equal(txEvent.args.newState, WillState.Pending, 'the will is applied with the wrong state');
  });

  it("should claim the will", async () => {
    let txResult, txEvent;

    txResult = await wpContract.claimWill(willId, { from: benf });
    txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
    assert.equal(txEvent.args.willId.toString(10), willId, 'the will is created with the wrong ID');
    assert.equal(txEvent.args.owner, user, 'the will is created for the wrong user');
    assert.equal(txEvent.args.newState, WillState.Claimed, 'the will is claimed with the wrong state');
  });

/*
  it("should return user's will id", async () => {
    let txResult, txEvent;

    txResult = await wpContract.userWills(user, 0, { from: user });
    console.log(txResult);
    txResult = await wpContract.userWills(user, 1, { from: user });
    console.log(txResult);
  });
*/

  it("should not decline the will", async () => {
    let txResult, txEvent;

    try {
      txResult = await wpContract.declineWill(willId, { from: prov });
      txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
      assert.isNull(txEvent, 'the will declined although should not');
    } catch (err) {
      assert.isNotNull(err, 'the will declined although should not');
    }
  });
});
