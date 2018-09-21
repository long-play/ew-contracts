const EWillToken = artifacts.require("EWillToken");
const EWillEscrow = artifacts.require("EWillEscrow");
const TestUtils = require('./test-utils.js');

contract('EWillEscrow', function(accounts) {
  const admin = accounts[0];
  const user  = accounts[1];
  const prov  = accounts[2];
  const provwl= accounts[3];
  const deleg = accounts[0];

  const ProviderState = {
    None: 0,
    Pending: 1,
    Whitlisted: 2,
    Activated: 3,
    Banned: 4
  };

  const annualFee = 1500;

  let ewToken = null;
  let ewEscrow = null;

  it("should create token", async () => {
    ewToken = await EWillToken.new(1.0e+21);
    await ewToken.transfer(prov, 15.0e+18);
  });

  it("should have a correct name", async () => {
    ewEscrow = await EWillEscrow.new(ewToken.address, 10);
    await ewToken.addMerchant(ewEscrow.address);

    const name = await ewEscrow.name.call();
    assert.equal(name, 'E-will Escrow', 'the contract has the wrong name');
  });

  it("should configure the contract", async () => {
    let txResult;
    txResult = await ewEscrow.setMinFund(5, { from: admin });

    const minProviderFund = await ewEscrow.minProviderFund.call();
    assert.equal(minProviderFund.toString(), '5000000000000000000', 'the contract has the wrong Minimal Escrow Fund');
  });

  it("should register a provider", async () => {
    let txResult;
    let isValid;
    txResult = await ewEscrow.register(annualFee, 0xdeadbeaf, deleg, { from: prov });
    txEvent = TestUtils.findEvent(txResult.logs, 'Registered');
    assert.equal(txEvent.args.provider, prov, 'the provider is registered with the wrong address');

    isValid = await ewEscrow.isProviderValid.call(prov);
    assert.equal(isValid, false, 'the contract has activated the provider on registration');

    txResult = await ewEscrow.activateProvider(prov, ProviderState.Activated, { from: admin });
    txEvent = TestUtils.findEvent(txResult.logs, 'Activated');
    assert.equal(txEvent.args.provider, prov, 'the provider is registered with the wrong address');
    assert.equal(txEvent.args.newState, ProviderState.Activated, 'the provider is registered with the wrong state');

    isValid = await ewEscrow.isProviderValid.call(prov);
    assert.equal(isValid, false, 'the contract has activated the provider before the provider has topuped the balance');

    txResult = await ewEscrow.topup(6.0e+18, { from: prov });
    txEvent = TestUtils.findEvent(txResult.logs, 'Funded');
    assert.equal(txEvent.args.willId, 0, 'the provider is funded with the wrong reason'); 
    assert.equal(txEvent.args.provider, prov, 'the provider is funded with the wrong address');
    assert.equal(txEvent.args.amount.toString(), '6000000000000000000', 'the provider is funded with the wrong amount');

    isValid = await ewEscrow.isProviderValid.call(prov);
    assert.equal(isValid, true, 'the contract has not activated the provider');
  });

  it("should whitelist a provider", async () => {
    let txResult;
    let isValid;
    txResult = await ewEscrow.register(annualFee, 0x8badfeed, deleg, { from: provwl });
    txEvent = TestUtils.findEvent(txResult.logs, 'Registered');
    assert.equal(txEvent.args.provider, provwl, 'the provider is registered with the wrong address');

    isValid = await ewEscrow.isProviderValid.call(provwl);
    assert.equal(isValid, false, 'the contract has activated the provider on registration');

    txResult = await ewEscrow.activateProvider(provwl, ProviderState.Whitlisted, { from: admin });
    txEvent = TestUtils.findEvent(txResult.logs, 'Activated');
    assert.equal(txEvent.args.provider, provwl, 'the provider is registered with the wrong address');
    assert.equal(txEvent.args.newState, ProviderState.Whitlisted, 'the provider is registered with the wrong state');

    isValid = await ewEscrow.isProviderValid.call(provwl);
    assert.equal(isValid, true, 'the contract has not activated the provider');
  });

  it("should allow to topup funds", async () => {
  });

  it("should allow to withdraw funds", async () => {
  });

  it("should not allow to withdraw more funds than a provider has", async () => {
  });

  it("should allow to change the delegate", async () => {
  });

});
