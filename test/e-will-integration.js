const EWillToken = artifacts.require('EWillToken');
const EWillEscrow = artifacts.require('EWillEscrow');
const EWillAccount = artifacts.require('EWillAccount');
const EWillFinance = artifacts.require('EWillFinance');
const EWillPlatform = artifacts.require('EWillPlatform');
const EWillMarketing = artifacts.require('EWillMarketing');
const keccak256 = require('js-sha3').keccak256;
const BN = require('bn.js');
const TestUtils = require('./test-utils.js');

contract('Integration test', function([
    plat,
    marketer,
    referrer,
    user,
    prov,
    provwl,
    benf,
    deleg,
    newDelegate,
  ]) {

  const ProviderState = {
    None: 0,
    Pending: 1,
    Whitelisted: 2,
    Activated: 3,
    Banned: 4
  };

  const WillState = {
    None: 0,
    Created: 1,
    Activated: 2,
    Pending: 3,
    Claimed: 4,
    Rejected: 5,
    Deleted: 6
  };

  const ONE_YEAR              = 365 * 24 * 3600; // in seconds
  const PLATFORM_FEE          = 1500;            // cents, $400
  const PROVIDER_FEE          = 2000;            // cents, $20
  const RATE_TOKEN            = 1.0e+14;         // tokenweis per cent, 100 $/EWILL
  const RATE_ETHER            = 1.0e+13;         // weis per cent, 1000 $/Ether
  const EXCHG_FEE             = 5;               // %
  const DISCOUNT              = 230;             // 23%
  const REWARD                = 120;             // 12%
  const PROVIDER_SPECIFIC_DSC = 450;             // 45%
  const PERCENT_MULTIPLIER    = 1000;            // 1000 is 100%
  const NUMBER_OF_PERIODS     = 12;              // periods per year
  const PERIOD_LENGTH         = 30 * 24 * 3600;  // one period per year (in seconds)
  const TIME_CORRECTION       = 10;              // 10 seconds for period length correction
  const benHash = new BN(keccak256((new BN(benf.slice(2), 16)).toBuffer()), 16);

  let ewPlatform = null;
  let ewFinance = null;
  let ewAccount = null;
  let ewEscrow = null;
  let ewToken = null;
  let ewMarketing = null;
  let txResult, txEvent;

  describe('configuration', () => {
    it('should get contract addresses', async () => {
      ewToken = await EWillToken.deployed();
      ewPlatform = await EWillPlatform.deployed();
      ewFinance = await EWillFinance.deployed();
      ewEscrow = await EWillEscrow.deployed();
      ewAccount = await EWillAccount.deployed();
      ewMarketing = await EWillMarketing.deployed();

      await ewToken.transfer(user, 200.0e+18);
      await ewToken.transfer(prov, 150.0e+18);
      await ewToken.transfer(plat, 150.0e+18);
      await ewToken.transfer(marketer, 20.0e+18);

      txResult = await ewFinance.setAnnaulPlatformFee(PLATFORM_FEE, { from: plat });
      txResult = await ewFinance.setExchangeRates(RATE_TOKEN, RATE_ETHER, { from: plat });
      txResult = await ewFinance.setExchangeFee(EXCHG_FEE, { from: plat });
    });
  });

  /*
    Description Integration test #01:
                1)  create provider
                2)  create a will and check balance
                3)  activate the will
                4)  prolong the will and collecting money from the user
                5)  refresh the will and check provider balance
                6)  allow to change the delegate
                7)  not update a will if an invalid delegate is specified
                8)  not apply the will if an invalid delegate is specified
                9)  refresh will new delegate and reward provider
                10) return the old delegate
                11) apply the will
                12) claim the will and check provider balance
                13) not delete the will, after a claim will
  */
  describe('#Integration test #01', () => {
    const willId = (new BN(prov.slice(2), 16)).iushln(96).iadd(new BN(0x31111d, 16)).toString(10);

    it('should create provider', async () => {
      const infoId = 0x0badfeed;

      txResult = await ewEscrow.register(PROVIDER_FEE, infoId, deleg, { from: prov });
      txResult = await ewEscrow.activateProvider(prov, ProviderState.Activated, { from: plat });
      txResult = await ewEscrow.topup(100.0e+18, { from: prov }); 
    });

    it('should create a will and check balance', async () => {
      const years = 2;
      const bPlatform = await ewToken.balanceOf(ewAccount.address);
      const bEscrow = await ewToken.balanceOf(ewEscrow.address);
      const bUser = await ewToken.balanceOf(user);

      txResult = await ewPlatform.createWill('Test will for EV', willId, 0x5108a9e, years, benHash.toString(10), prov, referrer, { from: user });
      txEvent = TestUtils.findEvent(txResult.logs, 'WillCreated');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.provider.should.be.bignumber.equal(prov);
      txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.newState.should.be.bignumber.equal(WillState.Created);

      txResult = (await ewToken.balanceOf(ewAccount.address)).sub(bPlatform);
      txResult.should.be.bignumber.equal(PLATFORM_FEE * RATE_TOKEN * years); 

      txResult = (await ewToken.balanceOf(ewEscrow.address)).sub(bEscrow);
      txResult.should.be.bignumber.equal(PROVIDER_FEE * RATE_TOKEN * years);

      txResult = bUser.sub(await ewToken.balanceOf(user));
      txResult.should.be.bignumber.equal((PLATFORM_FEE + PROVIDER_FEE) * RATE_TOKEN * years);
    });

    it('should activate the will', async () => {
      txResult = await ewPlatform.activateWill(willId, { from: deleg });
      txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.newState.should.be.bignumber.equal(WillState.Activated);
    });

    it('should prolong the will and collecting money from the user', async () => {
      const years = 1;
      const bUser = await ewToken.balanceOf(user);
      const bPlatform = await ewToken.balanceOf(ewAccount.address);
      const bEscrow = await ewToken.balanceOf(ewEscrow.address);

      await TestUtils.gotoFuture(ONE_YEAR * 2 - PERIOD_LENGTH / 2);
      txResult = await ewPlatform.prolongWill(willId, years, { from: user });
      const willUpdate = await ewPlatform.wills.call(willId);
      txEvent = TestUtils.findEvent(txResult.logs, 'WillProlonged');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.validTill.should.be.bignumber.equal(willUpdate[9]);

      txResult = (await ewToken.balanceOf(ewAccount.address)).sub(bPlatform);
      txResult.should.be.bignumber.equal(PLATFORM_FEE * RATE_TOKEN * years); 

      txResult = (await ewToken.balanceOf(ewEscrow.address)).sub(bEscrow);
      txResult.should.be.bignumber.equal(PROVIDER_FEE * RATE_TOKEN * years);

      txResult = bUser - await ewToken.balanceOf(user);
      txResult.should.be.bignumber.equal((PLATFORM_FEE + PROVIDER_FEE) * RATE_TOKEN * years);
    });

    it('should refresh the will and check provider balance', async () => {
      const bEscrow = await ewEscrow.providers(prov);
      const annualFee = await ewEscrow.providers(prov);

      await TestUtils.gotoFuture(PERIOD_LENGTH + TIME_CORRECTION);
      txResult = await ewPlatform.refreshWill(willId, true, { from: deleg });
      txEvent = TestUtils.findEvent(txResult.logs, 'WillRefreshed');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);

      const newbEscrow = await ewEscrow.providers(prov);
      txResult = Number(newbEscrow[1].sub(bEscrow[1]));
      txResult.should.be.equal((annualFee[0] * RATE_TOKEN) / NUMBER_OF_PERIODS); 
    });

    it('should allow to change the delegate', async () => {
      txResult = await ewEscrow.changeDelegate(newDelegate, { from: prov });
      txEvent = TestUtils.findEvent(txResult.logs, 'UpdatedDelegate');
      txEvent.args.provider.should.be.bignumber.equal(prov);
      txEvent.args.delegate.should.be.bignumber.equal(newDelegate);
      txResult = await ewEscrow.providerInfo(prov);
      txResult[2].should.be.bignumber.equal(newDelegate);
    });

    it('should not update a will if an invalid delegate is specified', async () => {
      let isCaught = false;

      try {
        await TestUtils.gotoFuture(PERIOD_LENGTH + TIME_CORRECTION);
        txResult = await ewPlatform.refreshWill(willId, true, { from: deleg });
      } catch (err) {
        isCaught = true;
      }
      isCaught.should.be.equal(true);
    });

    it('should not apply the will if an invalid delegate is specified', async () => {
      let isCaught = false;

      try {
        txResult = await ewPlatform.applyWill(willId, 0xe4c6, { from: deleg });
      } catch (err) {
        isCaught = true;
      }
      isCaught.should.be.equal(true);
    });
    
    it('should refresh will new delegate and reward provider', async () => {
      const bEscrow = await ewEscrow.providers(prov);
      const annualFee = await ewEscrow.providers(prov);

      await TestUtils.gotoFuture(PERIOD_LENGTH + TIME_CORRECTION);
      txResult = await ewPlatform.refreshWill(willId, true, { from: newDelegate });
      txEvent = TestUtils.findEvent(txResult.logs, 'WillRefreshed');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);

      const newbEscrow = await ewEscrow.providers(prov);
      txResult = Number(newbEscrow[1].sub(bEscrow[1]));
      txResult.should.be.equal(((annualFee[0] * RATE_TOKEN) / NUMBER_OF_PERIODS));
    });

    it('should return the old delegate', async () => {
      txResult = await ewEscrow.changeDelegate(deleg, { from: prov });
      txEvent = TestUtils.findEvent(txResult.logs, 'UpdatedDelegate');
      txEvent.args.provider.should.be.bignumber.equal(prov);
      txEvent.args.delegate.should.be.bignumber.equal(deleg);
      txResult = await ewEscrow.providerInfo(prov);
      txResult[2].should.be.bignumber.equal(deleg);
    });

    it('should apply the will', async () => {
      txResult = await ewPlatform.applyWill(willId, 0xe4c6, { from: deleg });
      txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.newState.should.be.bignumber.equal(WillState.Pending);
    });

    it('should claim the will and check provider balance', async () => {
      const years = 1;
      const bEscrow = await ewEscrow.providers(prov);
      const annualFee = await ewEscrow.providers(prov);

      txResult = await ewPlatform.claimWill(willId, { from: benf });
      txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.newState.should.be.bignumber.equal(WillState.Claimed);

      const newbEscrow = await ewEscrow.providers(prov);
      txResult = Number(newbEscrow[1].sub(bEscrow[1]));
      txResult.should.be.equal(annualFee[0] * RATE_TOKEN * (12 * years - 3) / 12);
    });

    it('should not delete the will, after a claim will', async () => {
      isCaught = false;

      try {
        txResult = await ewPlatform.deleteWill(willId, { from: user });
      } catch (err) {
        isCaught = true;
      }
      isCaught.should.be.equal(true);
    });
  });

  /*
    Description Integration test #02:
                1)  add discount
                2)  create a will and reward referrer
                3)  activate the will
                4)  delete the will and refund to the user
  */
  describe('#Integration test #02', () => {
    const willId = (new BN(prov.slice(2), 16)).iushln(96).iadd(new BN(0x31113d, 16)).toString(10);

    it('should add discount', async () => {
      const bReferrer = await ewToken.balanceOf(referrer);
      bReferrer.should.be.bignumber.equal(0);

      await ewMarketing.addDiscount(referrer,
                                    Date.now() / 1000,
                                    Date.now() / 1000 + ONE_YEAR,
                                    DISCOUNT,
                                    REWARD,
                                    [prov],
                                    [PROVIDER_SPECIFIC_DSC],
                                    { from: marketer });
    });

    it('should create a will and reward referrer', async () => {
      const years = 1;
      const entireDiscount = (PLATFORM_FEE * DISCOUNT + PROVIDER_FEE * PROVIDER_SPECIFIC_DSC) * RATE_TOKEN / PERCENT_MULTIPLIER;
      const refReward = PLATFORM_FEE * REWARD * RATE_TOKEN / PERCENT_MULTIPLIER;
      const bPlatform = await ewToken.balanceOf(ewAccount.address);
      const bEscrow = await ewToken.balanceOf(ewEscrow.address);
      const bUser = await ewToken.balanceOf(user);
      const bReferrer = await ewToken.balanceOf(referrer);

      txResult = await ewPlatform.createWill('Test will for EV', willId, 0x5108a9e, years, benHash.toString(10), prov, referrer, { from: user });
      txEvent = TestUtils.findEvent(txResult.logs, 'WillCreated');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.provider.should.be.bignumber.equal(prov);
      txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.newState.should.be.bignumber.equal(WillState.Created);

      txResult = (await ewToken.balanceOf(referrer)).sub(bReferrer);
      txResult.should.be.bignumber.equal(refReward);

      txResult = (await ewToken.balanceOf(ewAccount.address)).sub(bPlatform);
      txResult.should.be.bignumber.equal(PLATFORM_FEE * RATE_TOKEN); 

      txResult = (await ewToken.balanceOf(ewEscrow.address)).sub(bEscrow);
      txResult.should.be.bignumber.equal(PROVIDER_FEE * RATE_TOKEN);

      txResult = bUser.sub(await ewToken.balanceOf(user));
      txResult.should.be.bignumber.equal((PLATFORM_FEE + PROVIDER_FEE) * RATE_TOKEN - entireDiscount);
    });

    it('should activate the will', async () => {
      txResult = await ewPlatform.activateWill(willId, { from: deleg });
      txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.newState.should.be.bignumber.equal(WillState.Activated);
    });
    
    it('should delete the will and refund to the user', async () => {
      const bPlatform = await ewToken.balanceOf(ewAccount.address);
      const bEscrow = await ewEscrow.providers(prov);
      const bUser = await ewToken.balanceOf(user);
      const annualFee = await ewEscrow.providers(prov);

      txResult = await ewPlatform.deleteWill(willId, { from: user });
      txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.newState.should.be.bignumber.equal(WillState.Deleted);

      txResult = (await ewToken.balanceOf(ewAccount.address)).sub(bPlatform);
      txResult.should.be.bignumber.equal(0); 

      const newbEscrow = await ewEscrow.providers(prov);
      txResult = Number(newbEscrow[1].sub(bEscrow[1]));
      txResult.should.be.equal(0);

      txResult = Number((await ewToken.balanceOf(user)).sub(bUser));
      txResult.should.be.equal(annualFee[0] * RATE_TOKEN);
    });
  });

  /*
    Description Integration test #03:
                1)  register whitelist a provider
                2)  create a will and check balance
                3)  activate the will
                4)  the will and check the balance of the supplier who is whitelist
                5)  prolong the will and collecting money from the user
                6)  apply the will
                7)  claim the will and check the balance of the provider who is on the white list
  */
  describe('#Integration test #03', () => {
    const willId = (new BN(provwl.slice(2), 16)).iushln(96).iadd(new BN(0x31223d, 16)).toString(10);

    it('should register whitelist a provider', async () => {
      const infoId = 0x0badfeed;
      txResult = await ewEscrow.register(PROVIDER_FEE, infoId, deleg, { from: provwl });
      txResult = await ewEscrow.activateProvider(provwl, ProviderState.Whitelisted, { from: plat }); 
    });

    it('should create a will and check balance', async () => {
      const years = 2;
      const bPlatform = await ewToken.balanceOf(ewAccount.address);
      const bEscrow = await ewToken.balanceOf(ewEscrow.address);

      txResult = await ewPlatform.createWill('Test will for EV', willId, 0x5108a9e, years, benHash.toString(10), provwl, referrer, { from: user });
      txEvent = TestUtils.findEvent(txResult.logs, 'WillCreated');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.provider.should.be.bignumber.equal(provwl);
      txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.newState.should.be.bignumber.equal(WillState.Created);

      txResult = (await ewToken.balanceOf(ewAccount.address)).sub(bPlatform);
      txResult.should.be.bignumber.equal(PLATFORM_FEE * RATE_TOKEN * years); 

      txResult = (await ewToken.balanceOf(ewEscrow.address)).sub(bEscrow);
      txResult.should.be.bignumber.equal(PROVIDER_FEE * RATE_TOKEN * years);
    });

    it('should activate the will', async () => {
      txResult = await ewPlatform.activateWill(willId, { from: deleg });
      txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.newState.should.be.bignumber.equal(WillState.Activated);
    });

    it('should the will and check the balance of the supplier who is whitelist', async () => {
      const bEscrow = await ewEscrow.providers(provwl);
      const annualFee = await ewEscrow.providers(provwl);

      await TestUtils.gotoFuture(PERIOD_LENGTH + TIME_CORRECTION);
      txResult = await ewPlatform.refreshWill(willId, true, { from: deleg });
      txEvent = TestUtils.findEvent(txResult.logs, 'WillRefreshed');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);

      const newbEscrow = await ewEscrow.providers(provwl);
      txResult = Number(newbEscrow[1].sub(bEscrow[1]));
      txResult.should.be.equal((annualFee[0] * RATE_TOKEN) / NUMBER_OF_PERIODS);
    });

    it('should prolong the will and collecting money from the user', async () => {
      const years = 1;
      const bUser = await ewToken.balanceOf(user);
      const bPlatform = await ewToken.balanceOf(ewAccount.address);
      const bEscrow = await ewToken.balanceOf(ewEscrow.address);

      await TestUtils.gotoFuture(ONE_YEAR * 2 - PERIOD_LENGTH + TIME_CORRECTION);
      txResult = await ewPlatform.prolongWill(willId, years, { from: user });
      const willUpdate = await ewPlatform.wills.call(willId);
      txEvent = TestUtils.findEvent(txResult.logs, 'WillProlonged');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.validTill.should.be.bignumber.equal(willUpdate[9]);

      txResult = (await ewToken.balanceOf(ewAccount.address)).sub(bPlatform);
      txResult.should.be.bignumber.equal(PLATFORM_FEE * RATE_TOKEN * years); 

      txResult = (await ewToken.balanceOf(ewEscrow.address)).sub(bEscrow);
      txResult.should.be.bignumber.equal(PROVIDER_FEE * RATE_TOKEN * years);

      txResult = bUser.sub(await ewToken.balanceOf(user));
      txResult.should.be.bignumber.equal((PLATFORM_FEE + PROVIDER_FEE) * RATE_TOKEN * years);
    });

    it('should apply the will', async () => {
      txResult = await ewPlatform.applyWill(willId, 0xe4c6, { from: deleg });
      txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.newState.should.be.bignumber.equal(WillState.Pending);
    });

    it('should claim the will and check the balance of the provider who is on the white list', async () => {
      const years = 1;
      const bEscrow = await ewEscrow.providers(provwl);
      const annualFee = await ewEscrow.providers(provwl);

      txResult = await ewPlatform.claimWill(willId, { from: benf });
      txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.newState.should.be.bignumber.equal(WillState.Claimed);

      const newbEscrow = await ewEscrow.providers(provwl);
      txResult = Number(newbEscrow[1].sub(bEscrow[1]));
      txResult.should.be.equal(annualFee[0] * RATE_TOKEN * (12 * years) / 12);
    });
  });

  /*
    Description Integration test #04:
                1)  ban provider
                2)  not create a will if provider baned'
                3)  not withdraw funds banned provider
                4)  not allow to withdraw more funds, than there is
                5)  unban provider
                6)  create a will and check balance
                7)  allow to withdraw funds
  */
  describe('#Integration test #04', () => {
    const willId = (new BN(prov.slice(2), 16)).iushln(96).iadd(new BN(0x32223d, 16)).toString(10);

    it('should ban provider', async () => {
      txResult = await ewEscrow.banProvider(prov, { from: plat });
      txEvent = TestUtils.findEvent(txResult.logs, 'Banned');
      txEvent.args.provider.should.be.bignumber.equal(prov);
    });

    it('should not create a will if provider baned', async () => {
      const years = 2;
      let isCaught = false;

      try {
        txResult = await ewPlatform.createWill('Test will for EV', willId, 0x5108a9e, years, benHash.toString(10), prov, referrer, { from: user });
      } catch (err) {
          isCaught = true;
      }
      isCaught.should.be.equal(true);
    });

    it('should not withdraw funds banned provider', async () => {
      let isCaught = false;
      const amount = 2.0e+15;
  
      try {
        txResult = await ewEscrow.withdraw(amount, { from: prov });
      } catch (err) {
          isCaught = true;
      }
      isCaught.should.be.equal(true);
    });

    it('should unban provider', async () => {
      txResult = await ewEscrow.unbanProvider(prov, { from: plat });
      txEvent = TestUtils.findEvent(txResult.logs, 'Activated');
      txEvent.args.provider.should.be.bignumber.equal(prov);
      txEvent.args.newState.should.be.bignumber.equal(ProviderState.Activated);
    });

    it('should create a will and check balance', async () => {
      const years = 1;
      const entireDiscount = (PLATFORM_FEE * DISCOUNT + PROVIDER_FEE * PROVIDER_SPECIFIC_DSC) * RATE_TOKEN / PERCENT_MULTIPLIER;
      const refReward = PLATFORM_FEE * REWARD * RATE_TOKEN / PERCENT_MULTIPLIER;
      const bPlatform = await ewToken.balanceOf(ewAccount.address);
      const bEscrow = await ewToken.balanceOf(ewEscrow.address);
      const bUser = await ewToken.balanceOf(user);
      const bReferrer = await ewToken.balanceOf(referrer);
      
      txResult = await ewPlatform.createWill('Test will for EV', willId, 0x5108a9e, years, benHash.toString(10), prov, referrer, { from: user });
      txEvent = TestUtils.findEvent(txResult.logs, 'WillCreated');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.provider.should.be.bignumber.equal(prov);
      txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.newState.should.be.bignumber.equal(WillState.Created);

      txResult = (await ewToken.balanceOf(ewAccount.address)).sub(bPlatform);
      txResult.should.be.bignumber.equal(PLATFORM_FEE * RATE_TOKEN * years); 

      txResult = (await ewToken.balanceOf(ewEscrow.address)).sub(bEscrow);
      txResult.should.be.bignumber.equal(PROVIDER_FEE * RATE_TOKEN * years);

      txResult = (await ewToken.balanceOf(referrer)).sub(bReferrer);
      txResult.should.be.bignumber.equal(refReward * years);

      txResult = bUser.sub(await ewToken.balanceOf(user));
      txResult.should.be.bignumber.equal((PLATFORM_FEE + PROVIDER_FEE) * RATE_TOKEN - entireDiscount);
    });

    it('should not allow to withdraw more funds, than there is', async () => {
        let isCaught = false;
        const amount = 2.0e+20;
    
        try {
          txResult = await ewEscrow.withdraw(amount, { from: prov });
        } catch (err) {
            isCaught = true;
        }
        isCaught.should.be.equal(true);
      });

    it('should allow to withdraw funds', async () => {
      const amount = 2.0e+15;
      const bEscrow = await ewEscrow.providers(prov);
  
      txResult = await ewEscrow.withdraw(amount, { from: prov });
      txEvent = TestUtils.findEvent(txResult.logs, 'Withdrew');
      txEvent.args.provider.should.be.bignumber.equal(prov);
      const newbEscrow = await ewEscrow.providers(prov);
      txEvent.args.amount.should.be.bignumber.equal(bEscrow[1] - newbEscrow[1]);
    });
  });
});