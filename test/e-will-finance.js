const EWillToken = artifacts.require("EWillToken");
const EWillEscrow = artifacts.require("EWillEscrow");
const EWillAccount = artifacts.require("EWillAccount");
const EWillPlatform = artifacts.require("EWillPlatform");

const EWillFinance = artifacts.require("EWillFinance");
const keccak256 = require('js-sha3').keccak256;
const BN = require('bn.js');
const TestUtils = require('./test-utils.js');

contract('EWillFinance', function(accounts) {
  const admin = accounts[0];
  const user  = accounts[1];
  const prov  = accounts[2];
  const benf  = accounts[3];
  const plat  = accounts[4];
  const deleg = accounts[5];

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

  const TOKEN_SUPPLY = 100.0e+21;   // 100,000 EWILLs
  const PLATFORM_FEE = 1500;        // cents, $15
  const PROVIDER_FEE = 2000;        // cents, $20
  const REFFERER_RWD = 10;          // %
  const RATE_TOKEN   = 1.0e+14;     // tokenweis per cent, 100 $/EWILL
  const RATE_ETHER   = 1.0e+13;     // weis per cent, 1000 $/Ether
  const EXCHG_FEE    = 5;           // %

  let ewFinance = null;
  let ewAccount = null;
  let ewEscrow = null;
  let ewToken = null;

  it("should have a correct name", async () => {
    ewToken = await EWillToken.new(TOKEN_SUPPLY);
    ewEscrow = await EWillEscrow.new(ewToken.address, 70);
    ewAccount = await EWillAccount.new(ewToken.address, 1000, admin);
    ewFinance = await EWillFinance.new(PLATFORM_FEE / 2, ewAccount.address, ewEscrow.address, ewToken.address);

    await ewEscrow.setFinance(ewFinance.address);
    await ewAccount.setFinance(ewFinance.address);
    await ewFinance.setPlatform(plat);
    await ewFinance.setOracle(admin);
    await ewToken.transfer(user, 150.0e+18);
    await ewToken.transfer(prov, 150.0e+18);
    await ewToken.transfer(plat, 100.0e+18);
    await ewToken.transfer(ewFinance.address, 15.0e+18);

    const name = await ewFinance.name.call();
    assert.equal(name, 'E-Will Finance', 'the contract has the wrong name');
  });

  it("should configure the contract", async () => {
    let txResult;
    await ewToken.addMerchant(ewEscrow.address);
    await ewToken.addMerchant(ewAccount.address);
    await ewToken.addMerchant(ewFinance.address);

    txResult = await ewFinance.setReferrerDiscount(REFFERER_RWD, { from: admin });
    txResult = await ewFinance.setAnnaulPlatformFee(PLATFORM_FEE, { from: admin });
    txResult = await ewFinance.setExchangeRates(RATE_TOKEN, RATE_ETHER, { from: admin });
    txResult = await ewFinance.setExchangeFee(EXCHG_FEE, { from: admin });

    const annualPlatformFee = await ewFinance.annualPlatformFee.call();
    assert.equal(annualPlatformFee.toString(), PLATFORM_FEE, 'the contract has the wrong Annual Platform Fee');

    txResult = await ewEscrow.register(PROVIDER_FEE, 0x0badfeed, deleg, { from: prov });
    txResult = await ewEscrow.activateProvider(prov, ProviderState.Activated, { from: admin });
    txResult = await ewEscrow.topup(75.0e+18, { from: prov });
  });

  it("should charge", async () => {
    let txResult, txEvent;

    const bPlatform = await ewToken.balanceOf(plat);
    const bFinance = await ewToken.balanceOf(ewFinance.address);
    const bAccount = await ewToken.balanceOf(ewAccount.address);
    const bEscrow = await ewToken.balanceOf(ewEscrow.address);

    txResult = await ewFinance.charge(plat, PROVIDER_FEE, 0, 'tokens', { from: plat, value: 0 });

    assert.equal(bPlatform - await ewToken.balanceOf(plat), (PLATFORM_FEE + PROVIDER_FEE) * RATE_TOKEN, '');
    assert.equal(await ewToken.balanceOf(ewFinance.address) - bFinance, 0, '');
    assert.equal(await ewToken.balanceOf(ewAccount.address) - bAccount, PLATFORM_FEE * RATE_TOKEN, '');
    assert.equal(await ewToken.balanceOf(ewEscrow.address) - bEscrow, PROVIDER_FEE * RATE_TOKEN, '');
  });

  it("should charge with ethers", async () => {
    let txResult, txEvent;

    const ETH_VALUE = 7.0e+15;
    const ePlatform = await TestUtils.getBalance(ewFinance.address);
    const bPlatform = await ewToken.balanceOf(plat);
    const bFinance = await ewToken.balanceOf(ewFinance.address);
    const bAccount = await ewToken.balanceOf(ewAccount.address);
    const bEscrow = await ewToken.balanceOf(ewEscrow.address);

    txResult = await ewFinance.charge(plat, PROVIDER_FEE, 0, 'ethers', { from: plat, value: ETH_VALUE });

    assert.equal(await TestUtils.getBalance(ewFinance.address) - ePlatform, ETH_VALUE, '');
    assert.equal(bPlatform - await ewToken.balanceOf(plat), (PLATFORM_FEE + PROVIDER_FEE - ETH_VALUE / RATE_ETHER) * RATE_TOKEN, '');
    assert.equal(bFinance - await ewToken.balanceOf(ewFinance.address), ETH_VALUE / RATE_ETHER * RATE_TOKEN, '');
    assert.equal(await ewToken.balanceOf(ewAccount.address) - bAccount, PLATFORM_FEE * RATE_TOKEN, '');
    assert.equal(await ewToken.balanceOf(ewEscrow.address) - bEscrow, PROVIDER_FEE * RATE_TOKEN, '');
  });

  it("should charge with referrer reward", async () => {
    let txResult, txEvent;

    const bReferrer = await ewToken.balanceOf(benf);
    const bPlatform = await ewToken.balanceOf(plat);
    const bFinance = await ewToken.balanceOf(ewFinance.address);
    const bAccount = await ewToken.balanceOf(ewAccount.address);
    const bEscrow = await ewToken.balanceOf(ewEscrow.address);

    txResult = await ewFinance.charge(plat, PROVIDER_FEE, benf, 'referref', { from: plat, value: 0 });

    const refReward = PLATFORM_FEE * REFFERER_RWD / 100;
    assert.equal(await ewToken.balanceOf(benf) - bReferrer, refReward * RATE_TOKEN, '');
    assert.equal(bPlatform - await ewToken.balanceOf(plat), (PLATFORM_FEE + PROVIDER_FEE - refReward) * RATE_TOKEN, '');
    assert.equal(await ewToken.balanceOf(ewFinance.address) - bFinance, 0, '');
    assert.equal(await ewToken.balanceOf(ewAccount.address) - bAccount, (PLATFORM_FEE - 2 * refReward) * RATE_TOKEN, '');
    assert.equal(await ewToken.balanceOf(ewEscrow.address) - bEscrow, PROVIDER_FEE * RATE_TOKEN, '');
  });

  it("should reward a provider", async () => {
    let txResult, txEvent;

    txResult = await ewFinance.reward(prov, 1500, 0, { from: plat });
  });

  it("should exchange the tokens", async () => {
    let txResult, txEvent;

    const TKN_VALUE = 5.0e+15;
    const bUser = await ewToken.balanceOf(user);
    const bFinance = await ewToken.balanceOf(ewFinance.address);
    const eFinance = await TestUtils.getBalance(ewFinance.address);

    txResult = await ewFinance.exchangeTokens(TKN_VALUE, { from: user });
    assert.equal(bUser - await ewToken.balanceOf(user), TKN_VALUE, '');
    assert.equal(await ewToken.balanceOf(ewFinance.address) - bFinance, TKN_VALUE, '');
    assert.equal(eFinance - await TestUtils.getBalance(ewFinance.address), TKN_VALUE * ((100 - EXCHG_FEE) / 100) * (RATE_ETHER / RATE_TOKEN), '');
  });

});
