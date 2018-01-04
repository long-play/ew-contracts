const EWillEscrow = artifacts.require("EWillEscrow");
const EWillAccount = artifacts.require("EWillAccount");
const EWillPlatform = artifacts.require("EWillPlatform");
const keccak256 = require('js-sha3').keccak256;
const BN = require('bn.js');
const TestUtils = require('./test-utils.js');

contract('EWillPlatform', function(accounts) {
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

  let ewPlatform = null;
  let ewAccount = null;
  let ewEscrow = null;

  it("should have a correct name", async () => {
    ewEscrow = await EWillEscrow.new(100);
    ewAccount = await EWillAccount.new();
    ewPlatform = await EWillPlatform.new(1, ewAccount.address, ewEscrow.address);

    const name = await ewPlatform.name.call();
    assert.equal(name, 'E-Will Platform', 'the contract has the wrong name');
  });

  it("should configure the contract", async () => {
    let txResult;
    txResult = await ewPlatform.setAnnaulPlatformFee(5, { from: admin });
    txResult = await ewPlatform.setAnnaulProviderFee(10, { from: prov });

    const annualPlatformFee = await ewPlatform.annualPlatformFee.call();
    const annualProviderFee = await ewPlatform.annualProviderFee.call(prov);
    assert.equal(annualPlatformFee.toString(), '5', 'the contract has the wrong Annual Platform Fee');
    assert.equal(annualProviderFee.toString(), '10', 'the contract has the wrong Annual Provider Fee');
  });

  it("should create a will", async () => {
    let txResult, txEvent;

    let benHash = (new BN(benf.slice(2), 16)).toBuffer();
    benHash = new BN(keccak256(benHash), 16);

    txResult = await ewPlatform.createWill(willId, 0x5108a9e, benHash.toString(10), prov, { from: user, value: 2.0e+3 });
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

    txResult = await ewPlatform.activateWill(willId, { from: prov });
    txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
    assert.equal(txEvent.args.willId.toString(10), willId, 'the will is created with the wrong ID');
    assert.equal(txEvent.args.owner, user, 'the will is created for the wrong user');
    assert.equal(txEvent.args.newState, WillState.Activated, 'the will is activated with the wrong state');
  });

  it("should apply the will", async () => {
    let txResult, txEvent;

    txResult = await ewPlatform.applyWill(willId, 0xe4c6, { from: prov });
    txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
    assert.equal(txEvent.args.willId.toString(10), willId, 'the will is created with the wrong ID');
    assert.equal(txEvent.args.owner, user, 'the will is created for the wrong user');
    assert.equal(txEvent.args.newState, WillState.Pending, 'the will is applied with the wrong state');
  });

  it("should claim the will", async () => {
    let txResult, txEvent;

    txResult = await ewPlatform.claimWill(willId, { from: benf });
    txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
    assert.equal(txEvent.args.willId.toString(10), willId, 'the will is created with the wrong ID');
    assert.equal(txEvent.args.owner, user, 'the will is created for the wrong user');
    assert.equal(txEvent.args.newState, WillState.Claimed, 'the will is claimed with the wrong state');
  });

/*
  it("should return user's will id", async () => {
    let txResult, txEvent;

    txResult = await ewPlatform.userWills(user, 0, { from: user });
    console.log(txResult);
    txResult = await ewPlatform.userWills(user, 1, { from: user });
    console.log(txResult);
  });
*/

  it("should not decline the will", async () => {
    let txResult, txEvent;

    try {
      txResult = await ewPlatform.declineWill(willId, { from: prov });
      txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
      assert.isNull(txEvent, 'the will declined although should not');
    } catch (err) {
      assert.isNotNull(err, 'the will declined although should not');
    }
  });
});
