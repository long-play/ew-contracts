const EWillAccount = artifacts.require("EWillAccount");
const TestUtils = require('./test-utils.js');

contract('EWillAccount', function(accounts) {
  const admin   = accounts[0];
  const acc     = accounts[1];
  const holder1 = accounts[2];
  const holder2 = accounts[3];

  let ewAccount = null;

  it("should have a correct name", async () => {
    ewAccount = await EWillAccount.new(10, acc);

    const name = await ewAccount.name.call();
    assert.equal(name, 'E-Will Account', 'the contract has the wrong name');
  });

  it("should configure the contract", async () => {
    let txResult;
    txResult = await ewAccount.setMinLockedFund(15, { from: admin });

    const minLockedFund = await ewAccount.minLockedFund.call();
    assert.equal(minLockedFund.toString(), '15000000000000000000', 'the contract has the wrong Minimal Locked Fund');
  });

  it("should get funds", async () => {
    let txResult;
    txResult = await ewAccount.fund(0xdeadbeaf, { from: admin, value: 70.0e+18 });
    txEvent = TestUtils.findEvent(txResult.logs, 'Funded');
    assert.equal(txEvent.args.willId, 0xdeadbeaf, 'the fund was made for the wrong willId');
    assert.equal(txEvent.args.amount, 70.0e+18, 'the fund was made for the wrong amount');
  });

  it("should not pay more than a half of the balance for operational expenses", async () => {
    let txResult = null;
    const amount = 40.0e+18;

    try {
      txResult = await ewAccount.payOperationalExpenses(amount, { from: admin });
    } catch (err) {
      assert.isNotNull(err, 'the withdraw is not declined although should be');
    }
    assert.isNull(txResult, 'the withdraw is not declined although should be');
  });

  it("should pay for operational expenses", async () => {
    let txResult;
    const amount = 30.0e+18;
    txResult = await ewAccount.payOperationalExpenses(amount, { from: admin });

    txEvent = TestUtils.findEvent(txResult.logs, 'Withdrew');
    assert.equal(txEvent.args.amount, amount, 'withdrew the wrong amount');
  });

  it("should not pay oftener than a once per 28 days for operational expenses", async () => {
    let txResult = null;
    const amount = 10.0e+18;

    try {
      txResult = await ewAccount.payOperationalExpenses(amount, { from: admin });
    } catch (err) {
      assert.isNotNull(err, 'the withdraw is not declined although should be');
    }
    assert.isNull(txResult, 'the withdraw is not declined although should be');
  });

  it("should allow to park tokens", async () => {
  });

  it("should reward tokenholders", async () => {
  });

  it("should allow to unpark tokens", async () => {
  });

});
