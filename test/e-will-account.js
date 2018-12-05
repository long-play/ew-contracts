const EWillToken = artifacts.require('EWillToken');
const EWillAccount = artifacts.require('EWillAccount');
const TestUtils = require('./test-utils.js');

contract('EWillAccount', function([admin, acc, holder1, holder2]) {

  let ewAccount = null;
  let txResult, txEvent;

  it('should create token', async () => {
    ewToken = await EWillToken.new(1.0e+21);
    ewToken.transfer(holder1, 15.0e+18);
  });

  it('should have a correct name', async () => {
    ewAccount = await EWillAccount.new(ewToken.address, 10, acc);
    await ewToken.addMerchant(ewAccount.address);

    const name = await ewAccount.name.call();
    name.should.be.equal('E-will Account');
  });

  it('should configure the contract', async () => {
    txResult = await ewAccount.setFinance(admin, { from: admin });
  });

  it('should get funds', async () => {
    const willId = 0xdeadbeaf;
    const amount = 70.0e+18;
    // transfer tokens first
    txResult = await ewToken.transfer(ewAccount.address, 70.0e+18, { from: admin });
    txResult = await ewAccount.fund(willId, amount, { from: admin });
    txEvent = TestUtils.findEvent(txResult.logs, 'Funded');
    txEvent.args.willId.should.be.bignumber.equal(willId);
    txEvent.args.amount.should.be.bignumber.equal(amount);
  });

  it('should not pay more than a half of the balance for operational expenses', async () => {
    let isCaught = false;
    const amount = 40.0e+18;
    try {
      txResult = await ewAccount.payOperationalExpenses(amount, { from: admin });
      txEvent = TestUtils.findEvent(txResult.logs, 'Withdrew');
    } catch (err) {
      isCaught = true;
    }
    isCaught.should.be.equal(true);
  });

  it('should pay for operational expenses', async () => {
    const amount = 30.0e+18;
    txResult = await ewAccount.payOperationalExpenses(amount, { from: admin });
    txEvent = TestUtils.findEvent(txResult.logs, 'Withdrew');
    txEvent.args.amount.should.be.bignumber.equal(amount);
  });

  it('should not pay oftener than a once per 30 days for operational expenses', async () => {
    let isCaught = false;
    const amount = 10.0e+18;
    try {
      txResult = await ewAccount.payOperationalExpenses(amount, { from: admin });
      txEvent = TestUtils.findEvent(txResult.logs, 'Withdrew');
    } catch (err) {
      isCaught = true;
    }
    isCaught.should.be.equal(true);
  });

  it('should allow to park tokens', async () => {
  });

  it('should reward tokenholders', async () => {
  });

  it('should allow to unpark tokens', async () => {
  });
});
