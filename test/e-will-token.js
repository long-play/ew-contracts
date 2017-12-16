const EWillToken = artifacts.require("EWillToken");

contract('EWillToken', function(accounts) {
  const owner    = accounts[0];
  const account1 = accounts[1];

  let ewToken = null;

  it("should have a correct name", async () => {
    ewToken = await EWillToken.deployed();
    const name = await ewToken.name.call();
    assert.equal(name, 'EWill', 'the token has the wrong name');
  });

  it("should have a correct supply", async () => {
    const totalSupply = await ewToken.totalSupply.call();
    assert.equal(totalSupply, 100000, 'the token has the wrong Total Supply');
  });

  it("should grant the creator with the total supply", async () => {
    const totalSupply = await ewToken.totalSupply.call();
    const balance = await ewToken.balanceOf.call(owner);
    assert.equal(totalSupply.toString(), balance.toString(), 'the owner has the wrong token amount');
  });
});
