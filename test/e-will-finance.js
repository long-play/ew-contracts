const EWillToken = artifacts.require('EWillToken');
const EWillEscrow = artifacts.require('EWillEscrow');
const EWillAccount = artifacts.require('EWillAccount');
const EWillPlatform = artifacts.require('EWillPlatform');
const EWillMarketing = artifacts.require('EWillMarketing')
const EWillFinance = artifacts.require('EWillFinance');
const keccak256 = require('js-sha3').keccak256;
const BN = require('bn.js');
const TestUtils = require('./test-utils.js');

contract('EWillFinance', function([admin, user, prov, benf, plat, deleg]) {

  const ProviderState = {
    None: 0,
    Pending: 1,
    Whitlisted: 2,
    Activated: 3,
    Banned: 4
  };

  const WillState = {
    None: 0,
    Created: 1,
    Activated: 2,
    Pending: 3,
    Claimed: 4,
    Declined: 5
  };

  const ONE_YEAR               = 365 * 24 * 3600 * 1000; // in millisecond
  const TOKEN_SUPPLY           = 100.0e+21;              // 100,000 EWILLs
  const PLATFORM_FEE           = 1500;                   // cents, $15
  const PROVIDER_FEE           = 2000;                   // cents, $20
  const RATE_TOKEN             = 1.0e+14;                // tokenweis per cent, 100 $/EWILL
  const RATE_ETHER             = 1.0e+13;                // weis per cent, 1000 $/Ether
  const EXCHG_FEE              = 5;                      // %
  const DISCOUNT               = 230;                    // 23%
  const REWARD                 = 120;                    // 12%
  const PROVIDER_DEAFULT       = 0x0;                    // any provider
  const PROVIDER_DEAFULT_DSC   = 340;                    // 34%
  const PROVIDER_SPECIFIC_DSC  = 450;                    // 45%
  const NUMBER_OF_DISCOUNTS    = 100;

  let ewFinance = null;
  let ewAccount = null;
  let ewEscrow = null;
  let ewToken = null;
  let ewMarketing = null;
  let txResult;

  it('should have a correct name', async () => {
    ewToken = await EWillToken.new(TOKEN_SUPPLY);
    ewEscrow = await EWillEscrow.new(ewToken.address, 70);
    ewAccount = await EWillAccount.new(ewToken.address, 1000, admin);
    ewFinance = await EWillFinance.new(PLATFORM_FEE / 2, ewAccount.address, ewEscrow.address, ewToken.address);
    ewMarketing = await EWillMarketing.new(ewFinance.address, admin, ewToken.address);

    await ewEscrow.setFinance(ewFinance.address);
    await ewAccount.setFinance(ewFinance.address);
    await ewFinance.setPlatform(plat);
    await ewFinance.setMarketing(ewMarketing.address);
    await ewFinance.setOracle(admin);
    await ewToken.transfer(user, 150.0e+18);
    await ewToken.transfer(prov, 150.0e+18);
    await ewToken.transfer(plat, 100.0e+18);
    await ewToken.transfer(ewFinance.address, 15.0e+18);
    await ewToken.transfer(ewMarketing.address, 20.0e+18);

    const name = await ewFinance.name.call();
    name.should.be.equal('E-will Finance');
  });

  it('should configure the contract', async () => {
    await ewToken.addMerchant(ewEscrow.address);
    await ewToken.addMerchant(ewAccount.address);
    await ewToken.addMerchant(ewFinance.address);
    await ewMarketing.addDiscount(benf,
                                  TestUtils.now(),
                                  TestUtils.now() + ONE_YEAR,
                                  DISCOUNT,
                                  REWARD,
                                  NUMBER_OF_DISCOUNTS,
                                  [PROVIDER_DEAFULT,     prov],
                                  [PROVIDER_DEAFULT_DSC, PROVIDER_SPECIFIC_DSC],
                                  { from: admin });

    txResult = await ewFinance.setAnnaulPlatformFee(PLATFORM_FEE, { from: admin });
    txResult = await ewFinance.setExchangeRates(RATE_TOKEN, RATE_ETHER, { from: admin });
    txResult = await ewFinance.setExchangeFee(EXCHG_FEE, { from: admin });

    const annualPlatformFee = await ewFinance.platformFee.call(1);
    annualPlatformFee.should.be.bignumber.equal(PLATFORM_FEE);

    txResult = await ewEscrow.register(PROVIDER_FEE, 0x0badfeed, deleg, { from: prov });
    txResult = await ewEscrow.activateProvider(prov, ProviderState.Activated, { from: admin });
    txResult = await ewEscrow.topup(75.0e+18, { from: prov });
  });

  it('should charge', async () => {
    const TKN_VALUE = 0;
    const bPlatform = await ewToken.balanceOf(plat);
    const bFinance = await ewToken.balanceOf(ewFinance.address);
    const bAccount = await ewToken.balanceOf(ewAccount.address);
    const bEscrow = await ewToken.balanceOf(ewEscrow.address);

    txResult = await ewFinance.charge(plat, prov, 0x0, 1, 'tokens', { from: plat, value: TKN_VALUE });

    txResult = bPlatform - await ewToken.balanceOf(plat)
    txResult.should.be.bignumber.equal((PLATFORM_FEE + PROVIDER_FEE) * RATE_TOKEN);
    txResult = await ewToken.balanceOf(ewFinance.address) - bFinance;
    txResult.should.be.bignumber.equal(TKN_VALUE);
    txResult = await ewToken.balanceOf(ewAccount.address) - bAccount;
    txResult.should.be.bignumber.equal(PLATFORM_FEE * RATE_TOKEN);
    txResult = await ewToken.balanceOf(ewEscrow.address) - bEscrow;
    txResult.should.be.bignumber.equal(PROVIDER_FEE * RATE_TOKEN);
  });

  it('should charge with ethers', async () => {
    const ETH_VALUE = 7.0e+15;
    const ePlatform = await TestUtils.getBalance(ewFinance.address);
    const bPlatform = await ewToken.balanceOf(plat);
    const bFinance = await ewToken.balanceOf(ewFinance.address);
    const bAccount = await ewToken.balanceOf(ewAccount.address);
    const bEscrow = await ewToken.balanceOf(ewEscrow.address);

    txResult = await ewFinance.charge(plat, prov, 0x0, 1, 'ethers', { from: plat, value: ETH_VALUE });

    txResult = await TestUtils.getBalance(ewFinance.address) - ePlatform;
    txResult.should.be.bignumber.equal(ETH_VALUE);
    txResult = bPlatform - await ewToken.balanceOf(plat);
    txResult.should.be.bignumber.equal((PLATFORM_FEE + PROVIDER_FEE - ETH_VALUE / RATE_ETHER) * RATE_TOKEN);
    txResult = bFinance - await ewToken.balanceOf(ewFinance.address);
    txResult.should.be.bignumber.equal(ETH_VALUE / RATE_ETHER * RATE_TOKEN);
    txResult = await ewToken.balanceOf(ewAccount.address) - bAccount;
    txResult.should.be.bignumber.equal(PLATFORM_FEE * RATE_TOKEN);
    txResult = await ewToken.balanceOf(ewEscrow.address) - bEscrow;
    txResult.should.be.bignumber.equal(PROVIDER_FEE * RATE_TOKEN);
  });

  it('should charge with referrer reward', async () => {
    const entireDiscount = (PLATFORM_FEE * DISCOUNT + PROVIDER_FEE * PROVIDER_SPECIFIC_DSC) * RATE_TOKEN / 1000;
    const refReward = PLATFORM_FEE * REWARD * RATE_TOKEN / 1000;
    const referrer = benf;
    const bReferrer = await ewToken.balanceOf(benf);
    const bUser = await ewToken.balanceOf(plat);
    const bFinance = await ewToken.balanceOf(ewFinance.address);
    const bAccount = await ewToken.balanceOf(ewAccount.address);
    const bEscrow = await ewToken.balanceOf(ewEscrow.address);
    const bMarketing = await ewToken.balanceOf(ewMarketing.address);

    txResult = await ewFinance.charge(plat, prov, referrer, 1, 'referrer', { from: plat, value: 0 });

    txResult = await ewToken.balanceOf(referrer) - bReferrer;
    txResult.should.be.bignumber.equal(refReward);
    txResult = bUser - await ewToken.balanceOf(plat);
    txResult.should.be.bignumber.equal((PLATFORM_FEE + PROVIDER_FEE) * RATE_TOKEN - entireDiscount);
    bFinance.should.be.bignumber.equal(await ewToken.balanceOf(ewFinance.address));
    bAccount.should.be.bignumber.equal(await ewToken.balanceOf(ewAccount.address) - PLATFORM_FEE * RATE_TOKEN);
    bEscrow.should.be.bignumber.equal(await ewToken.balanceOf(ewEscrow.address) - PROVIDER_FEE * RATE_TOKEN);
    txResult = bMarketing - await ewToken.balanceOf(ewMarketing.address);
    txResult.should.be.bignumber.equal(entireDiscount + refReward);
  });

  it('should refund a user', async () => {
    const bEscrow = await ewToken.balanceOf(ewEscrow.address);
    const bUser = await ewToken.balanceOf(user);
    const refundAmount = 15.0e+18;

    txResult = await ewFinance.refund(user, refundAmount, 0, { from: plat });
    txEvent = TestUtils.findEvent(txResult.logs, 'Refunded');
    txResult = await ewToken.balanceOf(user) - bUser;
    txResult.should.be.bignumber.equal(refundAmount);

    txResult = bEscrow - await ewToken.balanceOf(ewEscrow.address);
    txResult.should.be.bignumber.equal(refundAmount);
  });

  it('should reward a provider', async () => {
    const rewardAmount = 6.0e+18;
    const providers = await ewEscrow.providers.call(prov);
    providers[1].should.be.bignumber.equal(await ewToken.balanceOf(prov));

    txResult = await ewFinance.reward(prov, rewardAmount, 0, { from: plat });
    txEvent = TestUtils.findEvent(txResult.logs, 'Funded');

    const providersNew = await ewEscrow.providers.call(prov);
    txResult = providersNew[1] - providers[1]; 
    txResult.should.be.bignumber.equal(rewardAmount);

  });

  it('should exchange the tokens', async () => {
    const TKN_VALUE = 5.0e+15;
    const bUser = await ewToken.balanceOf(user);
    const bFinance = await ewToken.balanceOf(ewFinance.address);
    const eFinance = await TestUtils.getBalance(ewFinance.address);

    txResult = await ewFinance.exchangeTokens(TKN_VALUE, { from: user });

    txResult = bUser - await ewToken.balanceOf(user);
    txResult.should.be.bignumber.equal(TKN_VALUE);
    txResult = await ewToken.balanceOf(ewFinance.address) - bFinance;
    txResult.should.be.bignumber.equal(TKN_VALUE);
    txResult = eFinance - await TestUtils.getBalance(ewFinance.address);
    txResult.should.be.bignumber.equal(TKN_VALUE * ((100 - EXCHG_FEE) / 100) * (RATE_ETHER / RATE_TOKEN));
  });

  it('should check how many token', async () => {
    txResult = await ewFinance.centsToTokens(PROVIDER_FEE);
    txResult.should.be.bignumber.equal(PROVIDER_FEE * RATE_TOKEN);
  });

  it('should check the total fee of 0 years', async () => {
    txResult = await ewFinance.totalFee(0, 0, 0);
    txResult[0].should.be.bignumber.equal(0);
    txResult[1].should.be.bignumber.equal(0);
    txResult[2].should.be.bignumber.equal(0);
  });

  it('should check the total fee of 2 years, without an reward and a subsidy', async () => {
    txResult = await ewFinance.totalFee(2, 0, 0);
    txResult[0].should.be.bignumber.equal(PLATFORM_FEE  * 2);
    txResult[1].should.be.bignumber.equal(0);
    txResult[2].should.be.bignumber.equal(0);
  });

  it('should check the total amount in 2 years without remuneration and subsidies, ' +
     'but indicating the provider', async () => {
    txResult = await ewFinance.totalFee(2, prov, 0);
    txResult[0].should.be.bignumber.equal((PLATFORM_FEE + PROVIDER_FEE) * 2);
    txResult[1].should.be.bignumber.equal(0);
    txResult[2].should.be.bignumber.equal(0);
  });

  it('should check the total fee of 2 years with reward and subsidy', async () => {
    txResult = await ewFinance.totalFee(2, prov, benf);
    txResult[0].should.be.bignumber.equal((PLATFORM_FEE + PROVIDER_FEE) * 2);
    txResult[1].should.be.bignumber.equal(((PLATFORM_FEE * REWARD) * 2) / 1000);
    txResult[2].should.be.bignumber.equal(((PLATFORM_FEE * DISCOUNT + PROVIDER_FEE * PROVIDER_SPECIFIC_DSC) * 2) / 1000);
  });

  it('should check the total fee ethers of 2 years', async () => {
    txResult = await ewFinance.totalFeeEthers(2, prov, benf);
    txResult[0].should.be.bignumber.equal(((PLATFORM_FEE + PROVIDER_FEE) * 2) * RATE_ETHER);
    txResult[1].should.be.bignumber.equal((((PLATFORM_FEE * REWARD) * 2) / 1000) * RATE_ETHER);
    txResult[2].should.be.bignumber.equal((((PLATFORM_FEE * DISCOUNT + PROVIDER_FEE * PROVIDER_SPECIFIC_DSC) * 2) / 1000) * RATE_ETHER);
  });

  it('should check the total fee token of 2 years', async () => {
    txResult = await ewFinance.totalFeeTokens(2, prov, benf);
    txResult[0].should.be.bignumber.equal(((PLATFORM_FEE + PROVIDER_FEE) * 2) * RATE_TOKEN);
    txResult[1].should.be.bignumber.equal((((PLATFORM_FEE * REWARD) * 2) / 1000) * RATE_TOKEN);
    txResult[2].should.be.bignumber.equal((((PLATFORM_FEE * DISCOUNT + PROVIDER_FEE * PROVIDER_SPECIFIC_DSC) * 2) / 1000) * RATE_TOKEN);
  });

  it('should check total fee of 2 years, without reward', async () => {
    const referrer = 0xcaccbb1;

    await ewMarketing.addDiscount(referrer,
                                  TestUtils.now(),
                                  TestUtils.now() + ONE_YEAR,
                                  DISCOUNT,
                                  0,
                                  NUMBER_OF_DISCOUNTS,
                                  [PROVIDER_DEAFULT,     prov],
                                  [PROVIDER_DEAFULT_DSC, PROVIDER_SPECIFIC_DSC],
                                  { from: admin });

    txResult = await ewFinance.totalFee(2, prov, referrer);
    txResult[0].should.be.bignumber.equal((PLATFORM_FEE + PROVIDER_FEE) * 2);
    txResult[1].should.be.bignumber.equal(0);
    txResult[2].should.be.bignumber.equal(((PLATFORM_FEE * DISCOUNT + PROVIDER_FEE * PROVIDER_SPECIFIC_DSC) * 2) / 1000);
  });

  it('should check the total fee of 2 years with reward and subsidy, ' + 
     'without specifying a discount when creating a discount', async () => {
    const referrer = 0xcaccbb2;

    await ewMarketing.addDiscount(referrer,
                                  TestUtils.now(),
                                  TestUtils.now() + ONE_YEAR,
                                  0,
                                  REWARD,
                                  NUMBER_OF_DISCOUNTS,
                                  [PROVIDER_DEAFULT,     prov],
                                  [PROVIDER_DEAFULT_DSC, PROVIDER_SPECIFIC_DSC],
                                  { from: admin });

    txResult = await ewFinance.totalFee(2, prov, referrer);
    txResult[0].should.be.bignumber.equal((PLATFORM_FEE + PROVIDER_FEE) * 2);
    txResult[1].should.be.bignumber.equal(((PLATFORM_FEE * REWARD) * 2) / 1000);
    txResult[2].should.be.bignumber.equal(((PROVIDER_FEE * PROVIDER_SPECIFIC_DSC) * 2) / 1000);
  });
});
