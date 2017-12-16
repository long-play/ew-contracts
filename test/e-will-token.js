const EWillToken = artifacts.require("EWillToken");
const TestUtils = require('./test-utils.js');

contract('EWillToken', function(accounts) {
  const owner    = accounts[0];
  const account1 = accounts[1];
  const ewTokenSupply = 100000;

  let ewToken = null;

  it("should have a correct name", async () => {
    ewToken = await EWillToken.new(ewTokenSupply);
    const name = await ewToken.name.call();
    assert.equal(name, 'EWill', 'the token has the wrong name');
  });

  it("should have a correct supply", async () => {
    const totalSupply = await ewToken.totalSupply.call();
    assert.equal(totalSupply.toString(), ewTokenSupply.toString(), 'the token has the wrong Total Supply');
  });

  it("should grant the creator with the total supply", async () => {
    const totalSupply = await ewToken.totalSupply.call();
    const balance = await ewToken.balanceOf.call(owner);
    assert.equal(totalSupply.toString(), balance.toString(), 'the owner has the wrong token amount');
  });

  it("should allow to transfer tokens", async () => {
    const transferAmout = 1000;
    const txResult = await ewToken.transfer(account1, transferAmout, { from: owner });
    txEvent = TestUtils.findEvent(txResult.logs, 'Transfer');
    assert.equal(txEvent.args.from, owner, 'transfered from the wrong account');
    assert.equal(txEvent.args.to, account1, 'transfered to the wrong account');
    assert.equal(txEvent.args.value, transferAmout, 'transfered wrong amount of tokens');

    const balance = await ewToken.balanceOf.call(account1);
    assert.equal(transferAmout.toString(), balance.toString(), 'the account1 has the wrong token amount');
  });
});
