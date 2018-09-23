const EWillToken = artifacts.require("EWillToken");
const EWillMarketing = artifacts.require("EWillMarketing");
const keccak256 = require('js-sha3').keccak256;
const BN = require('bn.js');
const TestUtils = require('./test-utils.js');

contract('EWillMarketing', function([admin, marketer, user, referrer]) {
  const TOKEN_SUPPLY = 100.0e+21;   // 100,000 EWILLs
  const PLATFORM_FEE = 200.0e+18;   // 200 EWILLs
  const PROVIDER_FEE = 70.0e+18;    // 70 EWILLs
  const DISCOUNT = 200;             // 20%
  const REWARD = 100;               // 10%
  const PERCENT_MULTIPLIER = 1000;  // 1000 is 100%
  const PROVIDER_DEAFULT = 0x0;     // any provider
  const PROVIDER_SPECIFIC = 0x1;    // specific provider
  const PROVIDER_OTHER = 0x2;       // other provider
  const PROVIDER_DEAFULT_DSC = 300; // 30%
  const PROVIDER_SPECIFIC_DSC = 400;// 40%

  let ewMarketing = null;
  let ewToken = null;

  it("should have a correct name", async () => {
    ewToken = await EWillToken.new(TOKEN_SUPPLY);
    ewMarketing = await EWillMarketing.new(user, marketer, ewToken.address);

    await ewToken.transfer(user, 150.0e+18);
    await ewToken.transfer(ewMarketing.address, 200.0e+18);

    const name = await ewMarketing.name.call();
    assert.equal(name, 'E-will Marketing', 'the contract has the wrong name');
  });

  it("should configure the contract", async () => {
    await ewMarketing.addDiscount(referrer,
                                  Date.now() / 1000,
                                  Date.now() / 1000 + 60,
                                  DISCOUNT,
                                  REWARD,
                                  [PROVIDER_DEAFULT,        PROVIDER_SPECIFIC],
                                  [PROVIDER_DEAFULT_DSC,    PROVIDER_SPECIFIC_DSC],
                                  { from: marketer });
  });

  it("should apply discount for specific provider", async () => {
    let txResult, txEvent;

    const bMarketing = await ewToken.balanceOf(ewMarketing.address);
    const bUser = await ewToken.balanceOf(user);
    const bReferrer = await ewToken.balanceOf(referrer);

    txResult = await ewMarketing.applyDiscount(PLATFORM_FEE, PROVIDER_FEE, PROVIDER_SPECIFIC, referrer, { from: user });

    const discountPl = PLATFORM_FEE * DISCOUNT / PERCENT_MULTIPLIER;
    const discountPr = PROVIDER_FEE * PROVIDER_SPECIFIC_DSC / PERCENT_MULTIPLIER;
    const reward = PLATFORM_FEE * REWARD / PERCENT_MULTIPLIER;
    assert.equal(bMarketing - await ewToken.balanceOf(ewMarketing.address), discountPl + discountPr + reward, '');
    assert.equal(await ewToken.balanceOf(user) - bUser, discountPl + discountPr, '');
    assert.equal(await ewToken.balanceOf(referrer) - bReferrer, reward, '');
  });

  it("should apply discount for regular provider", async () => {
    let txResult, txEvent;

    const bMarketing = await ewToken.balanceOf(ewMarketing.address);
    const bUser = await ewToken.balanceOf(user);
    const bReferrer = await ewToken.balanceOf(referrer);

    txResult = await ewMarketing.applyDiscount(PLATFORM_FEE, PROVIDER_FEE, PROVIDER_OTHER, referrer, { from: user });

    const discountPl = PLATFORM_FEE * DISCOUNT / PERCENT_MULTIPLIER;
    const discountPr = PROVIDER_FEE * PROVIDER_DEAFULT_DSC / PERCENT_MULTIPLIER;
    const reward = PLATFORM_FEE * REWARD / PERCENT_MULTIPLIER;
    assert.equal(bMarketing - await ewToken.balanceOf(ewMarketing.address), discountPl + discountPr + reward, '');
    assert.equal(await ewToken.balanceOf(user) - bUser, discountPl + discountPr, '');
    assert.equal(await ewToken.balanceOf(referrer) - bReferrer, reward, '');
  });

});
