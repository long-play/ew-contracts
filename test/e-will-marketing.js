const EWillToken = artifacts.require('EWillToken');
const EWillMarketing = artifacts.require('EWillMarketing');
const keccak256 = require('js-sha3').keccak256;
const BN = require('bn.js');
const TestUtils = require('./test-utils.js');

contract('EWillMarketing', function([admin, marketer, finance, referrer]) {

  const TOKEN_SUPPLY          = 100.0e+21; // 100,000 EWILLs
  const PLATFORM_FEE          = 50.0e+18;  // 50 EWILLs
  const PROVIDER_FEE          = 30.0e+18;  // 30 EWILLs
  const DISCOUNT              = 200;       // 20%
  const REWARD                = 100;       // 10%
  const PERCENT_MULTIPLIER    = 1000;      // 1000 is 100%
  const PROVIDER_DEAFULT      = 0x0;       // any provider
  const PROVIDER_SPECIFIC     = 0x1;       // specific provider
  const PROVIDER_OTHER        = 0x2;       // other provider
  const PROVIDER_DEAFULT_DSC  = 340;       // 34%
  const PROVIDER_SPECIFIC_DSC = 450;       // 45%

  let ewMarketing = null;
  let ewToken = null;
  let txResult;

  it('should have a correct name', async () => {
    ewToken = await EWillToken.new(TOKEN_SUPPLY);
    ewMarketing = await EWillMarketing.new(finance, marketer, ewToken.address);

    await ewToken.transfer(finance, 150.0e+18);
    await ewToken.transfer(ewMarketing.address, 800.0e+18);

    const name = await ewMarketing.name.call();
    name.should.be.equal('E-will Marketing');
  });

  it('should configure the contract', async () => {
    await ewMarketing.addDiscount(referrer,
                                  Date.now() / 1000,
                                  Date.now() / 1000 + 60,
                                  DISCOUNT,
                                  REWARD,
                                  [PROVIDER_DEAFULT,     PROVIDER_SPECIFIC],
                                  [PROVIDER_DEAFULT_DSC, PROVIDER_SPECIFIC_DSC],
                                  { from: marketer });
  });

  it('should apply discount for deafult provider', async () => {
    const bMarketing = await ewToken.balanceOf(ewMarketing.address);
    const bFinance = await ewToken.balanceOf(finance);
    const bReferrer = await ewToken.balanceOf(referrer);

    txResult = await ewMarketing.applyDiscount(PLATFORM_FEE, PROVIDER_FEE, PROVIDER_DEAFULT, referrer, { from: finance });

    const discountPl = PLATFORM_FEE * DISCOUNT / PERCENT_MULTIPLIER;
    const discountPr = PROVIDER_FEE * PROVIDER_DEAFULT_DSC / PERCENT_MULTIPLIER;
    const reward = PLATFORM_FEE * REWARD / PERCENT_MULTIPLIER;

    txResult = bMarketing - await ewToken.balanceOf(ewMarketing.address);
    txResult.should.be.bignumber.equal(discountPl + discountPr + reward);
    txResult = await ewToken.balanceOf(finance) - bFinance;
    txResult.should.be.bignumber.equal(discountPl + discountPr);
    txResult = await ewToken.balanceOf(referrer) - bReferrer;
    txResult.should.be.bignumber.equal(reward);
  });

  it('should apply discount for specific provider', async () => {
    const bMarketing = await ewToken.balanceOf(ewMarketing.address);
    const bFinance = await ewToken.balanceOf(finance);
    const bReferrer = await ewToken.balanceOf(referrer);

    txResult = await ewMarketing.applyDiscount(PLATFORM_FEE, PROVIDER_FEE, PROVIDER_SPECIFIC, referrer, { from: finance });

    const discountPl = PLATFORM_FEE * DISCOUNT / PERCENT_MULTIPLIER;
    const discountPr = PROVIDER_FEE * PROVIDER_SPECIFIC_DSC / PERCENT_MULTIPLIER;
    const reward = PLATFORM_FEE * REWARD / PERCENT_MULTIPLIER;

    txResult = bMarketing - await ewToken.balanceOf(ewMarketing.address);
    txResult.should.be.bignumber.equal(discountPl + discountPr + reward);
    txResult = await ewToken.balanceOf(finance) - bFinance;
    txResult.should.be.bignumber.equal(discountPl + discountPr);
    txResult = await ewToken.balanceOf(referrer) - bReferrer;
    txResult.should.be.bignumber.equal(reward);
  });

  it('should apply discount for regular provider', async () => {
    const bMarketing = await ewToken.balanceOf(ewMarketing.address);
    const bFinance = await ewToken.balanceOf(finance);
    const bReferrer = await ewToken.balanceOf(referrer);

    txResult = await ewMarketing.applyDiscount(PLATFORM_FEE, PROVIDER_FEE, PROVIDER_OTHER, referrer, { from: finance });

    const discountPl = PLATFORM_FEE * DISCOUNT / PERCENT_MULTIPLIER;
    const discountPr = PROVIDER_FEE * PROVIDER_DEAFULT_DSC / PERCENT_MULTIPLIER;
    const reward = PLATFORM_FEE * REWARD / PERCENT_MULTIPLIER;

    txResult = bMarketing - await ewToken.balanceOf(ewMarketing.address);
    txResult.should.be.bignumber.equal(discountPl + discountPr + reward);
    txResult = await ewToken.balanceOf(finance) - bFinance;
    txResult.should.be.bignumber.equal(discountPl + discountPr);
    txResult = await ewToken.balanceOf(referrer) - bReferrer;
    txResult.should.be.bignumber.equal(reward);
  });

  it('should add discount and apply discount for deafult provider', async () => {
    const referrerCustom = 0xcaccbb1;

    await ewMarketing.addDiscount(referrerCustom,
                                  Date.now() / 1000,
                                  Date.now() / 1000 + 60,
                                  DISCOUNT,
                                  REWARD,
                                  [PROVIDER_DEAFULT],
                                  [PROVIDER_DEAFULT_DSC],
                                  { from: marketer });

    const bMarketing = await ewToken.balanceOf(ewMarketing.address);
    const bFinance = await ewToken.balanceOf(finance);
    const bReferrer = await ewToken.balanceOf(referrerCustom);

    txResult = await ewMarketing.applyDiscount(PLATFORM_FEE, PROVIDER_FEE, PROVIDER_DEAFULT, referrerCustom, { from: finance });

    const discountPl = PLATFORM_FEE * DISCOUNT / PERCENT_MULTIPLIER;
    const discountPr = PROVIDER_FEE * PROVIDER_DEAFULT_DSC / PERCENT_MULTIPLIER;
    const reward = PLATFORM_FEE * REWARD / PERCENT_MULTIPLIER;

    txResult = bMarketing - await ewToken.balanceOf(ewMarketing.address);
    txResult.should.be.bignumber.equal(discountPl + discountPr + reward);
    txResult = await ewToken.balanceOf(finance) - bFinance;
    txResult.should.be.bignumber.equal(discountPl + discountPr);
    txResult = await ewToken.balanceOf(referrerCustom) - bReferrer;
    txResult.should.be.bignumber.equal(reward);
  });

  it('should add discounts specific provider, deafult provider and apply discount for specific provider', async () => {
    //todo: test fails, need to fix marketing contract(method addDiscount)
    const referrer = 0xcaccbb2;

    await ewMarketing.addDiscount(referrer,
                                  Date.now() / 1000,
                                  Date.now() / 1000 + 60,
                                  DISCOUNT,
                                  REWARD,
                                  [PROVIDER_SPECIFIC],
                                  [PROVIDER_SPECIFIC_DSC],
                                  { from: marketer });

    await ewMarketing.addDiscount(referrer,
                                  Date.now() / 1000,
                                  Date.now() / 1000 + 60,
                                  DISCOUNT,
                                  REWARD,
                                  [PROVIDER_DEAFULT],
                                  [PROVIDER_DEAFULT_DSC],
                                  { from: marketer });

    const bMarketing = await ewToken.balanceOf(ewMarketing.address);
    const bFinance = await ewToken.balanceOf(finance);
    const bReferrer = await ewToken.balanceOf(referrer);

    txResult = await ewMarketing.applyDiscount(PLATFORM_FEE, PROVIDER_FEE, PROVIDER_SPECIFIC, referrer, { from: finance });

    const discountPl = PLATFORM_FEE * DISCOUNT / PERCENT_MULTIPLIER;
    const discountPr = PROVIDER_FEE * PROVIDER_DEAFULT_DSC / PERCENT_MULTIPLIER;
    const reward = PLATFORM_FEE * REWARD / PERCENT_MULTIPLIER;

    txResult = bMarketing - await ewToken.balanceOf(ewMarketing.address);
    txResult.should.be.bignumber.equal(discountPl + discountPr + reward);
    txResult = await ewToken.balanceOf(finance) - bFinance;
    txResult.should.be.bignumber.equal(discountPl + discountPr);
    txResult = await ewToken.balanceOf(referrer) - bReferrer;
    txResult.should.be.bignumber.equal(reward);
  });

  it('should check, that the discount applies from referrerCustomTwo', async () => {
    const referrerOne = 0xcaccbb2a;
    const referrerTwo = 0xcaccbb2b;

    await ewMarketing.addDiscount(referrerOne,
                                  Date.now() / 1000,
                                  Date.now() / 1000 + 60,
                                  DISCOUNT,
                                  REWARD,
                                  [PROVIDER_DEAFULT],
                                  [PROVIDER_DEAFULT_DSC],
                                  { from: marketer });

    await ewMarketing.addDiscount(referrerTwo,
                                  Date.now() / 1000,
                                  Date.now() / 1000 + 60,
                                  DISCOUNT,
                                  REWARD,
                                  [PROVIDER_SPECIFIC],
                                  [PROVIDER_SPECIFIC_DSC],
                                  { from: marketer });

    const bMarketing = await ewToken.balanceOf(ewMarketing.address);
    const bFinance = await ewToken.balanceOf(finance);
    const bReferrer = await ewToken.balanceOf(referrerTwo);

    txResult = await ewMarketing.applyDiscount(PLATFORM_FEE, PROVIDER_FEE, PROVIDER_SPECIFIC, referrerTwo, { from: finance });

    const discountPl = PLATFORM_FEE * DISCOUNT / PERCENT_MULTIPLIER;
    const discountPr = PROVIDER_FEE * PROVIDER_SPECIFIC_DSC / PERCENT_MULTIPLIER;
    const reward = PLATFORM_FEE * REWARD / PERCENT_MULTIPLIER;

    txResult = bMarketing - await ewToken.balanceOf(ewMarketing.address);
    txResult.should.be.bignumber.equal(discountPl + discountPr + reward);
    txResult = await ewToken.balanceOf(finance) - bFinance;
    txResult.should.be.bignumber.equal(discountPl + discountPr);
    txResult = await ewToken.balanceOf(referrerTwo) - bReferrer;
    txResult.should.be.bignumber.equal(reward);
  });

  it('should add discount specific provider and apply a discount for other provider, not in a list for subsidy', async () => {
    const referrer = 0xcaccbb3;

    await ewMarketing.addDiscount(referrer,
                                  Date.now() / 1000,
                                  Date.now() / 1000 + 60,
                                  DISCOUNT,
                                  REWARD,
                                  [PROVIDER_SPECIFIC],
                                  [PROVIDER_SPECIFIC_DSC],
                                  { from: marketer });

    const bMarketing = await ewToken.balanceOf(ewMarketing.address);
    const bFinance = await ewToken.balanceOf(finance);
    const bReferrer = await ewToken.balanceOf(referrer);

    txResult = await ewMarketing.applyDiscount(PLATFORM_FEE, PROVIDER_FEE, PROVIDER_OTHER, referrer, { from: finance });

    const discountPl = PLATFORM_FEE * DISCOUNT / PERCENT_MULTIPLIER;
    const discountPr = PROVIDER_FEE * 0 / PERCENT_MULTIPLIER;
    const reward = PLATFORM_FEE * REWARD / PERCENT_MULTIPLIER;

    txResult = bMarketing - await ewToken.balanceOf(ewMarketing.address);
    txResult.should.be.bignumber.equal(discountPl + discountPr + reward);
    txResult = await ewToken.balanceOf(finance) - bFinance;
    txResult.should.be.bignumber.equal(discountPl + discountPr);
    txResult = await ewToken.balanceOf(referrer) - bReferrer;
    txResult.should.be.bignumber.equal(reward);
  });

  it('should check create discount, if set the same start and end date', async () => {
    const referrer = 0xcaccbb4;
    let isCaught = false;

    try {
      await ewMarketing.addDiscount(referrer,
                                    Date.now() / 1000,
                                    Date.now() / 1000,
                                    DISCOUNT,
                                    REWARD,
                                    [PROVIDER_SPECIFIC],
                                    [PROVIDER_SPECIFIC_DSC],
                                    { from: marketer });
    } catch (err) {
        isCaught = true;
    }
    isCaught.should.be.equal(true);
  });

  it('should check the create of a discount, if the discount is set to more pecent multiplier', async () => {
    const referrer= 0xcaccbb5;
    let isCaught = false;
    let bigDiscount = 1100;

    try {
      await ewMarketing.addDiscount(referrer,
                                    Date.now() / 1000,
                                    Date.now() / 1000 + 60,
                                    bigDiscount,
                                    REWARD,
                                    [PROVIDER_SPECIFIC],
                                    [PROVIDER_SPECIFIC_DSC],
                                    { from: marketer });
    } catch (err) {
        isCaught = true;
    }
    isCaught.should.be.equal(true);
  });

  it('should check the create of a discount, if the reward is set to more pecent multiplier', async () => {
    const referrer = 0xcaccbb6;
    let isCaught = false;
    let bigReward = 1100;

    try {
      await ewMarketing.addDiscount(referrer,
                                    Date.now() / 1000,
                                    Date.now() / 1000 + 60,
                                    DISCOUNT,
                                    bigReward,
                                    [PROVIDER_SPECIFIC],
                                    [PROVIDER_SPECIFIC_DSC],
                                    { from: marketer });
    } catch (err) {
        isCaught = true;
    }
    isCaught.should.be.equal(true);
  });

  it('should check the create of a discount, if the number of providers is more than discounts', async () => {
    const referrer = 0xcaccbb7;
    let isCaught = false;

    try {
      await ewMarketing.addDiscount(referrer,
                                    Date.now() / 1000,
                                    Date.now() / 1000 + 60,
                                    DISCOUNT,
                                    REWARD,
                                    [PROVIDER_DEAFULT,  PROVIDER_OTHER],
                                    [PROVIDER_DEAFULT_DSC],
                                    { from: marketer });
    } catch (err) {
        isCaught = true;
    }
      isCaught.should.be.equal(true);
  });

  it('should check the create of a discount, if the number of discounts is more than providers', async () => {
    const referrer = 0xcaccbb8;
    let isCaught = false;

    try {
      await ewMarketing.addDiscount(referrer,
                                    Date.now() / 1000,
                                    Date.now() / 1000 + 60,
                                    DISCOUNT,
                                    REWARD,
                                    [PROVIDER_SPECIFIC],
                                    [PROVIDER_DEAFULT_DSC, PROVIDER_SPECIFIC_DSC],
                                    { from: marketer });
    } catch (err) {
        isCaught = true;
    }
    isCaught.should.be.equal(true);
  });

  it('should check the create of a discount, if there is no discounts', async () => {
    const referrer = 0xcaccbb9;
    let isCaught = false;

    try {
      await ewMarketing.addDiscount(referrer,
                                    Date.now() / 1000,
                                    Date.now() / 1000 + 60,
                                    DISCOUNT,
                                    REWARD,
                                    [PROVIDER_SPECIFIC],
                                    [],
                                    { from: marketer });
    } catch (err) {
      isCaught = true;
    }
    isCaught.should.be.equal(true);
  });

  it('should check the create of a discount, if there is no provider', async () => {
    const referrer = 0xcaccbb9a;
    let isCaught = false;

    try {
      await ewMarketing.addDiscount(referrer,
                                    Date.now() / 1000,
                                    Date.now() / 1000 + 60,
                                    DISCOUNT,
                                    REWARD,
                                    [],
                                    [PROVIDER_SPECIFIC_DSC],
                                    { from: marketer });
    } catch (err) {
      isCaught = true;
    }
    isCaught.should.be.equal(true);
  });

  it('should check the create of a discount, if there is no provider and discounts', async () => {
    const referrer = 0xcaccbb9b;
    let isCaught = false;

    try {
      await ewMarketing.addDiscount(referrer,
                                    Date.now() / 1000,
                                    Date.now() / 1000 + 60,
                                    DISCOUNT,
                                    REWARD,
                                    [],
                                    [],
                                    { from: marketer });
    } catch (err) {
      isCaught = true;
    }
    isCaught.should.be.equal(false);
  });

  it('should get standаrt discount', async () => {
    const referrer = 0xcaccba1;
    let standartDiscount = 200;

    await ewMarketing.createRefCode(referrer, { from: finance });
    txResult = await ewMarketing.referrerDiscount(PLATFORM_FEE , PROVIDER_FEE, PROVIDER_DEAFULT, referrer);
    txResult[0].should.be.bignumber.equal(PLATFORM_FEE * standartDiscount / PERCENT_MULTIPLIER);
    txResult[1].should.be.bignumber.equal(PLATFORM_FEE * standartDiscount / PERCENT_MULTIPLIER);
  });

  it('should change standаrt discount', async () => {
    const referrer = 0xcaccba2;

    await ewMarketing.setRefCodeParams(DISCOUNT, REWARD, { from: marketer });
    await ewMarketing.createRefCode(referrer, { from: finance });
    txResult = await ewMarketing.referrerDiscount(PLATFORM_FEE , PROVIDER_FEE, PROVIDER_DEAFULT, referrer);
    txResult[0].should.be.bignumber.equal(PLATFORM_FEE * DISCOUNT / PERCENT_MULTIPLIER);
    txResult[1].should.be.bignumber.equal(PLATFORM_FEE * REWARD / PERCENT_MULTIPLIER);
  });

  it('change the standard discount to 0', async () => {
    const referrer = 0xcaccba3;

    await ewMarketing.setRefCodeParams(0, 0, { from: marketer });
    await ewMarketing.createRefCode(referrer, { from: finance });
    txResult = await ewMarketing.referrerDiscount(PLATFORM_FEE , PROVIDER_FEE, PROVIDER_DEAFULT, referrer);
    txResult[0].should.be.bignumber.equal(0);
    txResult[1].should.be.bignumber.equal(0);
  });

  it('should get standаrt discount whith specific provider', async () => {
    const referrer = 0xcaccba4;
    let standartDiscount = 200;

    await ewMarketing.setRefCodeParams(standartDiscount, standartDiscount, { from: marketer });
    await ewMarketing.createRefCode(referrer, { from: finance });
    txResult = await ewMarketing.referrerDiscount(PLATFORM_FEE , PROVIDER_FEE, PROVIDER_SPECIFIC, referrer);
    txResult[0].should.be.bignumber.equal(PLATFORM_FEE * standartDiscount / PERCENT_MULTIPLIER);
    txResult[1].should.be.bignumber.equal(PLATFORM_FEE * standartDiscount / PERCENT_MULTIPLIER);
  });

  it('should get standаrt discount whith other provider', async () => {
    const referrer = 0xcaccba5;
    let standartDiscount = 200;

    await ewMarketing.createRefCode(referrer, { from: finance });
    txResult = await ewMarketing.referrerDiscount(PLATFORM_FEE , PROVIDER_FEE, PROVIDER_OTHER, referrer);
    txResult[0].should.be.bignumber.equal(PLATFORM_FEE * standartDiscount / PERCENT_MULTIPLIER);
    txResult[1].should.be.bignumber.equal(PLATFORM_FEE * standartDiscount / PERCENT_MULTIPLIER);
  });
});
