var WPlatform = artifacts.require("WPlatform");

contract('WPlatform', function(accounts) {
  it("should have a correct name", async () => {
    const wpContract = await WPlatform.deployed();
    assert.equal(await wpContract.name.call(), 'WPlatform', 'the contract has the wrong name');
  });
});
