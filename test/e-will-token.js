const EWillToken = artifacts.require('EWillToken');
const TestUtils = require('./test-utils.js');

contract('EWillToken', function([owner, account1]) {

  const ewTokenSupply = 100000;

  let ewToken = null;

  it('should have a correct name', async () => {
    ewToken = await EWillToken.new(ewTokenSupply);
    const name = await ewToken.name.call();
    name.should.be.equal('E-will Token');
  });

  it('should have a correct supply', async () => {
    const totalSupply = await ewToken.totalSupply.call();
    totalSupply.toString().should.be.equal(ewTokenSupply.toString());
  });

  it('should grant the creator with the total supply', async () => {
    const totalSupply = await ewToken.totalSupply.call();
    const balance = await ewToken.balanceOf.call(owner);
    totalSupply.toString().should.be.equal(balance.toString());
  });

  it('should allow to transfer tokens', async () => {
    const transferAmout = 1000;
    const txResult = await ewToken.transfer(account1, transferAmout, { from: owner });
    txEvent = TestUtils.findEvent(txResult.logs, 'Transfer');
    txEvent.args.from.should.be.bignumber.equal(owner);
    txEvent.args.to.should.be.bignumber.equal(account1);
    txEvent.args.value.should.be.bignumber.equal(transferAmout);

    const balance = await ewToken.balanceOf.call(account1);
    transferAmout.toString().should.be.equal(balance.toString());
  });
});
