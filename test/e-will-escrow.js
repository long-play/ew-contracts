const EWillToken = artifacts.require('EWillToken');
const EWillEscrow = artifacts.require('EWillEscrow');
const TestUtils = require('./test-utils.js');

contract('EWillEscrow', function([admin, user, prov, provwl, deleg]) {

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
  let txResult, txEvent, isValid;

  it('should create token', async () => {
    ewToken = await EWillToken.new(1.0e+21);
    await ewToken.transfer(prov, 15.0e+18);
  });

  it('should have a correct name', async () => {
    ewEscrow = await EWillEscrow.new(ewToken.address, 10);
    await ewToken.addMerchant(ewEscrow.address);

    const name = await ewEscrow.name.call();
    name.should.be.equal('E-will Escrow');
  });

  it('should configure the contract', async () => {
    txResult = await ewEscrow.setMinFund(5, { from: admin });
    const minProviderFund = await ewEscrow.minProviderFund.call();
    minProviderFund.should.be.bignumber.equal('5000000000000000000');
  });

  it('should register a provider', async () => {
    txResult = await ewEscrow.register(annualFee, 0xdeadbeaf, deleg, { from: prov });
    txEvent = TestUtils.findEvent(txResult.logs, 'Registered');
    txEvent.args.provider.should.be.bignumber.equal(prov);

    isValid = await ewEscrow.isProviderValid.call(prov);
    isValid.should.be.equal(false);

    txResult = await ewEscrow.activateProvider(prov, ProviderState.Activated, { from: admin });
    txEvent = TestUtils.findEvent(txResult.logs, 'Activated');
    txEvent.args.provider.should.be.bignumber.equal(prov);
    txEvent.args.newState.should.be.bignumber.equal(ProviderState.Activated);

    isValid = await ewEscrow.isProviderValid.call(prov);
    isValid.should.be.equal(false);

    txResult = await ewEscrow.topup(6.0e+18, { from: prov });
    txEvent = TestUtils.findEvent(txResult.logs, 'Funded');
    txEvent.args.willId.should.be.bignumber.equal(0);
    txEvent.args.provider.should.be.bignumber.equal(prov);
    txEvent.args.amount.should.be.bignumber.equal('6000000000000000000');

    isValid = await ewEscrow.isProviderValid.call(prov);
    isValid.should.be.equal(true);
  });

  it('should whitelist a provider', async () => {
    txResult = await ewEscrow.register(annualFee, 0x8badfeed, deleg, { from: provwl });
    txEvent = TestUtils.findEvent(txResult.logs, 'Registered');
    txEvent.args.provider.should.be.bignumber.equal(provwl);

    isValid = await ewEscrow.isProviderValid.call(provwl);
    isValid.should.be.equal(false);

    txResult = await ewEscrow.activateProvider(provwl, ProviderState.Whitlisted, { from: admin });
    txEvent = TestUtils.findEvent(txResult.logs, 'Activated');
    txEvent.args.provider.should.be.bignumber.equal(provwl);
    txEvent.args.newState.should.be.bignumber.equal(ProviderState.Whitlisted);

    isValid = await ewEscrow.isProviderValid.call(provwl);
    isValid.should.be.equal(true);
  });

  it('should allow to topup funds', async () => {
  });

  it('should allow to withdraw funds', async () => {
  });

  it('should not allow to withdraw more funds than a provider has', async () => {
  });

  it('should allow to change the delegate', async () => {
  });

});
