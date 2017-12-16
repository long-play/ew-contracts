const EWillPreTokensale = artifacts.require("EWillPreTokensale");
const EWillToken = artifacts.require("EWillToken");
const TestUtils = require('./test-utils.js');

const timeout = ms => new Promise(res => setTimeout(res, ms));

contract('EWillPreTokensale', function(accounts) {
  const owner    = accounts[0];
  const account1 = accounts[1];
  const account2 = accounts[2];

  let ewToken = null;
  let ewPreTokensale = null;

  it("should have a correct name", async () => {
    const now = Date.now() / 1000;
    ewPreTokensale = await EWillPreTokensale.new(10, now + 2, now + 60);
    ewToken = EWillToken.at(await ewPreTokensale.token.call());
    const name = await ewPreTokensale.name.call();
    assert.equal(name, 'E-Will Pre-Tokensale', 'the contract has the wrong name');
  });

  it("should have a correct supply", async () => {
    const totalSupplyToken = await ewToken.totalSupply.call();
    const totalSupplyPresale = await ewPreTokensale.tokenTotalSupply.call();
    assert.equal(totalSupplyToken.toString(), totalSupplyPresale.toString(), 'the token has the wrong Total Supply');
  });

  it("should not allow to buy tokens before tokensale starts", async () => {
    const sendAmount = 2.0e+18;
    const balanceBefore = await ewToken.balanceOf.call(account1);
    let txResult = null;
    try {
      txResult = await ewPreTokensale.sendTransaction({ value: sendAmount, from: account1 });
    } catch (err) {
      assert.isNotNull(err, 'the user bought tokens before the tokensale started');
    }
    assert.isNull(txResult, 'the user bought tokens before the tokensale started');

    const balanceAfter = await ewToken.balanceOf.call(account1);
    const balanceDiff = balanceAfter - balanceBefore;
    assert.equal(balanceDiff.toString(), '0', 'the account1 has the wrong token amount');
  });

  it("should allow to buy tokens", async () => {
    await timeout(3000);
    const sendAmount = 2.0e+18;
    const receiveAmount = 2.0e+19;
    const balanceBefore = await ewToken.balanceOf.call(account1);
    const txResult = await ewPreTokensale.sendTransaction({ value: sendAmount, from: account1 });
    txEvent = TestUtils.findEvent(txResult.logs, 'NewContribution');
    assert.equal(txEvent.args.holder, account1, 'transfered to the wrong account');
    assert.equal(txEvent.args.tokenAmount.toString(), receiveAmount.toString(), 'transfered wrong amount of tokens');

    const balanceAfter = await ewToken.balanceOf.call(account1);
    const balanceDiff = balanceAfter - balanceBefore;
    assert.equal(receiveAmount.toString(), balanceDiff.toString(), 'the account1 has the wrong token amount');
  });

  it("should not allow to buy less tokens than allowed", async () => {
    const sendAmount = 5.0e+17;
    const balanceBefore = await ewToken.balanceOf.call(account1);
    let txResult = null;
    try {
      txResult = await ewPreTokensale.sendTransaction({ value: sendAmount, from: account1 });
    } catch (err) {
      assert.isNotNull(err, 'the user bought less tokens than allowed');
    }
    assert.isNull(txResult, 'the user bought less tokens than allowed');

    const balanceAfter = await ewToken.balanceOf.call(account1);
    const balanceDiff = balanceAfter - balanceBefore;
    assert.equal(balanceDiff.toString(), '0', 'the account1 has the wrong token amount');
  });

  it("should not allow to buy more tokens than allowed", async () => {
    const sendAmount = 105.0e+18;
    const balanceBefore = await ewToken.balanceOf.call(account1);
    let txResult = null;
    try {
      txResult = await ewPreTokensale.sendTransaction({ value: sendAmount, from: account1 });
    } catch (err) {
      assert.isNotNull(err, 'the user bought more tokens than allowed');
    }
    assert.isNull(txResult, 'the user bought more tokens than allowed');

    const balanceAfter = await ewToken.balanceOf.call(account1);
    const balanceDiff = balanceAfter - balanceBefore;
    assert.equal(balanceDiff.toString(), '0', 'the account1 has the wrong token amount');
  });
});
