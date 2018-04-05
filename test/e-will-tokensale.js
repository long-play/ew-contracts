const EWillTokensale = artifacts.require("EWillTokensale");
const EWillToken = artifacts.require("EWillToken");
const TestUtils = require('./test-utils.js');

contract('EWillTokensale', function(accounts) {
  const owner    = accounts[0];
  const account1 = accounts[1];
  const account2 = accounts[2];
  const wallet   = accounts[3];

  const totalSupply = 100.0e+18;
  let ewToken = null;
  let ewTokensale = null;

  it("should have a correct name", async () => {
    const now = Date.now() / 1000;
    ewToken = EWillToken.new(totalSupply);
    ewTokensale = await EWillTokensale.new(ewToken.address);
    const name = await ewTokensale.name.call();
    assert.equal(name, 'E-Will Tokensale', 'the contract has the wrong name');
  });

/*
  it("should have a correct supply", async () => {
    const totalSupplyToken = await ewToken.totalSupply.call();
    const totalSupplyPresale = await ewTokensale.tokenTotalSupply.call();
    assert.equal(totalSupplyToken.toString(), totalSupplyPresale.toString(), 'the token has the wrong Total Supply');
  });

  it("should not allow to buy tokens before tokensale starts", async () => {
    const sendAmount = 2.0e+18;
    const balanceBefore = await ewToken.balanceOf.call(account1);
    let txResult = null;
    try {
      txResult = await ewTokensale.sendTransaction({ value: sendAmount, from: account1 });
    } catch (err) {
      assert.isNotNull(err, 'the user bought tokens before the tokensale started');
    }
    assert.isNull(txResult, 'the user bought tokens before the tokensale started');

    const balanceAfter = await ewToken.balanceOf.call(account1);
    const balanceDiff = balanceAfter - balanceBefore;
    assert.equal(balanceDiff.toString(), '0', 'the account1 has the wrong token amount');
  });

  it("should allow to buy tokens", async () => {
    await TestUtils.timeout(3000);
    const sendAmount = 2.0e+18;
    const receiveAmount = 2.0e+19;
    const balanceBefore = await ewToken.balanceOf.call(account1);
    const txResult = await ewTokensale.sendTransaction({ value: sendAmount, from: account1 });
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
      txResult = await ewTokensale.sendTransaction({ value: sendAmount, from: account1 });
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
      txResult = await ewTokensale.sendTransaction({ value: sendAmount, from: account1 });
    } catch (err) {
      assert.isNotNull(err, 'the user bought more tokens than allowed');
    }
    assert.isNull(txResult, 'the user bought more tokens than allowed');

    const balanceAfter = await ewToken.balanceOf.call(account1);
    const balanceDiff = balanceAfter - balanceBefore;
    assert.equal(balanceDiff.toString(), '0', 'the account1 has the wrong token amount');
  });

  it("should not allow to finalize the tokensale before it ends", async () => {
    const balanceBefore = await ewToken.balanceOf.call(wallet);
    let txResult = null;
    try {
      txResult = await ewTokensale.finalize(wallet, { from: owner });
    } catch (err) {
      assert.isNotNull(err, 'the tokensale finalized before it ends');
    }
    assert.isNull(txResult, 'the tokensale finalized before it ends');

    const balanceAfter = await ewToken.balanceOf.call(wallet);
    const balanceDiff = balanceAfter - balanceBefore;
    assert.equal(balanceDiff.toString(), '0', 'the wallet has the wrong token amount');
  });

  it("should allow to finalize the tokensale", async () => {
    await TestUtils.timeout(3000);
    const collected = await ewTokensale.collected.call();
    const totalSupply = await ewTokensale.tokenTotalSupply.call();
    const unsoldTokens = totalSupply.sub(collected);

    const balanceBefore = await ewToken.balanceOf.call(wallet);
    const txResult = await ewTokensale.finalize(wallet, { from: owner });
    txEvent = TestUtils.findEvent(txResult.logs, 'TokensaleFinalized');
    assert.equal(txEvent.args.collected.toString(), collected.toString(), 'collected wrong amount of tokens');

    const balanceAfter = await ewToken.balanceOf.call(wallet);
    const balanceDiff = balanceAfter.sub(balanceBefore);
    assert.equal(balanceDiff.toString(), unsoldTokens.toString(), 'the wallet has the wrong token amount');
  });

  it("should not allow to buy tokens after the tokensale finalized", async () => {
    const sendAmount = 2.0e+18;
    const balanceBefore = await ewToken.balanceOf.call(account1);
    let txResult = null;
    try {
      txResult = await ewTokensale.sendTransaction({ value: sendAmount, from: account1 });
    } catch (err) {
      assert.isNotNull(err, 'the user bought tokens after the tokensale finalized');
    }
    assert.isNull(txResult, 'the user bought tokens after the tokensale finalized');

    const balanceAfter = await ewToken.balanceOf.call(account1);
    const balanceDiff = balanceAfter - balanceBefore;
    assert.equal(balanceDiff.toString(), '0', 'the account1 has the wrong token amount');
  });
*/
});
