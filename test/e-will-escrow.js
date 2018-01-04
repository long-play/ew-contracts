const EWillEscrow = artifacts.require("EWillEscrow");
const TestUtils = require('./test-utils.js');

contract('EWillEscrow', function(accounts) {
  const admin = accounts[0];
  const user  = accounts[1];
  const prov  = accounts[2];
  const provwl= accounts[3];

  let ewEscrow = null;

  it("should have a correct name", async () => {
    ewEscrow = await EWillEscrow.new(10);

    const name = await ewEscrow.name.call();
    assert.equal(name, 'E-Will Escrow', 'the contract has the wrong name');
  });

  it("should configure the contract", async () => {
    let txResult;
    txResult = await ewEscrow.setMinFund(5, { from: admin });

    const minProviderFund = await ewEscrow.minProviderFund.call();
    assert.equal(minProviderFund.toString(), '5000000000000000000', 'the contract has the wrong Minimal Escrow Fund');
  });

  it("should register a provider", async () => {
    let txResult;
    txResult = await ewEscrow.register(0xdeadbeaf, { from: prov, value: 7.0e+18 });
    txEvent = TestUtils.findEvent(txResult.logs, 'Registered');
    assert.equal(txEvent.args.provider, prov, 'the provider is registered with the wrong address');
    assert.equal(txEvent.args.amount, 7.0e+18, 'the provider is registered with the wrong amount');

    const isValid = await ewEscrow.isProviderValid.call(prov);
    assert.equal(isValid, true, 'the contract has declined the provider');
  });

  it("should whitelist a provider", async () => {
    let txResult;
    txResult = await ewEscrow.addWhitelistedProvider(provwl, { from: admin });

    txResult = await ewEscrow.register(0x0badfeed, { from: provwl, value: 1.0e+18 });
    txEvent = TestUtils.findEvent(txResult.logs, 'Registered');
    assert.equal(txEvent.args.provider, provwl, 'the provider is registered with the wrong address');
    assert.equal(txEvent.args.amount, 1.0e+18, 'the provider is registered with the wrong amount');

    const isValid = await ewEscrow.isProviderValid.call(provwl);
    assert.equal(isValid, true, 'the contract has declined the provider');
  });

  it("should allow to topup funds", async () => {
  });

  it("should allow to withdraw funds", async () => {
  });

  it("should not allow to withdraw more funds than a provider has", async () => {
  });

});
