const EWillToken = artifacts.require('EWillToken');
const EWillEscrow = artifacts.require('EWillEscrow');
const EWillAccount = artifacts.require('EWillAccount');
const EWillFinance = artifacts.require('EWillFinance');
const EWillPlatform = artifacts.require('EWillPlatform');
const keccak256 = require('js-sha3').keccak256;
const BN = require('bn.js');
const TestUtils = require('./test-utils.js');

contract('EWillPlatform', function([admin, user, prov, benf, deleg]) {

  const ewTokenSupply = 100.0e+21;
  const amount = 20.0e+15;

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
    Rejected: 5,
    Deleted: 6
  };

  const ONE_YEAR     = 365 * 24 * 3600; // in seconds
  const TOKEN_SUPPLY = 100.0e+21;       // 100,000 EWILLs
  const PLATFORM_FEE = 1500;            // cents, $15
  const PROVIDER_FEE = 2000;            // cents, $20
  const REFFERER_RWD = 10;              // %
  const RATE_TOKEN   = 1.0e+14;         // tokenweis per cent, 100 $/EWILL
  const RATE_ETHER   = 1.0e+13;         // weis per cent, 1000 $/Ether
  const benHash = new BN(keccak256((new BN(benf.slice(2), 16)).toBuffer()), 16);

  let ewPlatform = null;
  let ewFinance = null;
  let ewAccount = null;
  let ewEscrow = null;
  let ewToken = null;
  let txResult, txEvent;

  async function createActivatedWill(willId, prov, deleg, user, amount, years) {
    txResult = await ewPlatform.createWill('Test will for EV', willId, 0x5108a9e, years, benHash.toString(10), prov, '0', { from: user, value: amount });
    txEvent = TestUtils.findEvent(txResult.logs, 'WillCreated');
    txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');

    txResult = await ewPlatform.activateWill(willId, { from: deleg });
    txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
  }

  describe('#configuration', () => {
    it('should have a correct name', async () => {
      ewToken = await EWillToken.new(ewTokenSupply);
      ewEscrow = await EWillEscrow.new(ewToken.address, 70);
      ewAccount = await EWillAccount.new(ewToken.address, 1000, admin);
      ewFinance = await EWillFinance.new(PLATFORM_FEE / 2, ewAccount.address, ewEscrow.address, ewToken.address);
      ewPlatform = await EWillPlatform.new(ewFinance.address, ewEscrow.address, admin);

      await ewFinance.setPlatform(ewPlatform.address);
      await ewAccount.setFinance(ewFinance.address);
      await ewEscrow.setFinance(ewFinance.address);
      await ewToken.transfer(user, 150.0e+18);
      await ewToken.transfer(prov, 150.0e+18);
      await ewToken.transfer(ewFinance.address, 15.0e+21);

      const name = await ewPlatform.name.call();
      name.should.be.equal('E-will Platform');
    });

    it('should configure the contract', async () => {
      await ewToken.addMerchant(ewEscrow.address);
      await ewToken.addMerchant(ewAccount.address);
      await ewToken.addMerchant(ewFinance.address);

      txResult = await ewFinance.setAnnaulPlatformFee(500, { from: admin });
      // 1 ether == $1000, 1 EWILL == $100
      txResult = await ewFinance.setExchangeRates(1.0e+14, 1.0e+13, { from: admin });

      const annualPlatformFee = await ewFinance.platformFee.call(1);
      annualPlatformFee.should.be.bignumber.equal(500);

      txResult = await ewPlatform.annualPlatformFee.call(2);
      txResult.should.be.bignumber.equal(1000);

      txResult = await ewEscrow.register(1000, 0x0badfeed, deleg, { from: prov });
      txResult = await ewEscrow.activateProvider(prov, ProviderState.Activated, { from: admin });
      txResult = await ewEscrow.topup(75.0e+18, { from: prov });
    });
  });

  describe('#creation and claim of will', () => {
    const willId = (new BN(prov.slice(2), 16)).iushln(96).iadd(new BN(0x31111d, 16)).toString(10);

    it('should check before the creation of a will', async () => {
      const will = await ewPlatform.wills.call(willId);
      will[0].should.be.bignumber.equal(0);
      will[10].should.be.bignumber.equal(WillState.None);
    });

    it('should create a will', async () => {
      txResult = await ewPlatform.createWill('Test will for EV', willId, 0x5108a9e, 1, benHash.toString(10), prov, '0', { from: user, value: 20.0e+15 });
      txEvent = TestUtils.findEvent(txResult.logs, 'WillCreated');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.provider.should.be.bignumber.equal(prov);
      txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.newState.should.be.bignumber.equal(WillState.Created);

      const will = await ewPlatform.wills.call(willId);
      will[12].should.be.equal('Test will for EV');
    });

    it('should activate the will', async () => {
      txResult = await ewPlatform.activateWill(willId, { from: deleg });
      txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.newState.should.be.bignumber.equal(WillState.Activated);
    });

    it('should apply the will', async () => {
      txResult = await ewPlatform.applyWill(willId, 0xe4c6, { from: deleg });
      txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.newState.should.be.bignumber.equal(WillState.Pending);
    });

    it('should claim the will', async () => {
      txResult = await ewPlatform.claimWill(willId, { from: benf });
      txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.newState.should.be.bignumber.equal(WillState.Claimed);
    });

    it('should to be checked after create of the will', async () => {
      const will = await ewPlatform.wills.call(willId);
      will[0].should.be.bignumber.equal(willId);
      will[5].should.be.bignumber.equal(0xe4c6);
      will[10].should.be.bignumber.equal(WillState.Claimed);
    });
  });

  describe('#delegate decline the will', () => {
    const willId = (new BN(prov.slice(2), 16)).iushln(96).iadd(new BN(0x31111c, 16)).toString(10);
    const years = 2;

    it('should create and activate the will', async () => {
      await createActivatedWill(willId, prov, deleg, user, amount, years);
    });

    it('should not decline the will, the period of validity of the will has not yet expired', async () => {
      let isCaught = false;
      try {
        await TestUtils.gotoFuture(1 * ONE_YEAR);
        txResult = await ewPlatform.rejectWill(willId, { from: deleg });
      } catch (err) {
          isCaught = true;
      }
      isCaught.should.be.equal(true);
    });

    it('should decline the will', async () => {
      await TestUtils.gotoFuture(2 * ONE_YEAR + 1);
      txResult = await ewPlatform.rejectWill(willId, { from: deleg });
      txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.newState.should.be.bignumber.equal(WillState.Rejected);
    });
  });

  describe('#user delete the will', () => {
    const willId = (new BN(prov.slice(2), 16)).iushln(96).iadd(new BN(0x31111e, 16)).toString(10);
    const years = 2;

    it('should create and activate the will', async () => {
      await createActivatedWill(willId, prov, deleg, user, amount, years);
    });

    it('should delete the will', async () => {
      txResult = await ewPlatform.deleteWill(willId, { from: user });
      txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.newState.should.be.bignumber.equal(WillState.Deleted);
    });

    it('should to be checked after delete of the will', async () => {
      const will = await ewPlatform.wills.call(willId);
      will[0].should.be.bignumber.equal(willId);
      will[10].should.be.bignumber.equal(WillState.Deleted);
    });
  });

  describe('#activate, apply and claim the will after deleted', () => {
    const willId = (new BN(prov.slice(2), 16)).iushln(96).iadd(new BN(0x31111e, 16)).toString(10);

    it('should activate the will after deleted', async () => {
      let isCaught = false;

      try {
        txResult = await ewPlatform.activateWill(willId, { from: deleg });
      } catch(err) {
          isCaught = true;
      }
      isCaught.should.be.equal(true)
    });

    it('should apply the will after deleted', async () => {
      let isCaught = false;

      try {
        txResult = await ewPlatform.applyWill(willId, 0xe4c6, { from: deleg });
      } catch(err) {
          isCaught = true;
      }
      isCaught.should.be.equal(true);
    });

    it('should claim the will after deleted', async () => {
      let isCaught = false;

      try { 
        txResult = await ewPlatform.claimWill(willId, { from: benf });
      } catch(err) {
        isCaught = true;
      }
      isCaught.should.be.equal(true);
    });
  });

  describe('#delegate refresh the will', () => {
    const willId = (new BN(prov.slice(2), 16)).iushln(96).iadd(new BN(0x31112d, 16)).toString(10);
    const years = 2;

    it('should create and activate the will', async () => {
      await createActivatedWill(willId, prov, deleg, user, amount, years);
    });

    it('should not refresh the will, since it did not expired 30 days', async () => {
      const twenty_nine_days = 29 * 24 * 3600;
      let isCaught = false;

      try {
        await TestUtils.gotoFuture(twenty_nine_days);
        txResult = await ewPlatform.refreshWill(willId, true, { from: deleg });
      } catch (err) {
          isCaught = true;
      }
      isCaught.should.be.equal(true);
    });

    it('should refresh the will', async () => {
      const thirty_days = 30 * 24 * 3600;

      await TestUtils.gotoFuture(thirty_days);
      txResult = await ewPlatform.refreshWill(willId, true, { from: deleg });
      txEvent = TestUtils.findEvent(txResult.logs, 'WillRefreshed');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
    });

    it('should to be checked after refresh of the will', async () => {
      const will = await ewPlatform.wills.call(willId);
      will[0].should.be.bignumber.equal(willId);
      will[10].should.be.bignumber.equal(WillState.Activated);
    });
  });

  describe('#delegate prolong the will', () => {
    const willId = (new BN(prov.slice(2), 16)).iushln(96).iadd(new BN(0x31113e, 16)).toString(10);
    const years = 2;

    it('should create and activate the will', async () => {
      await createActivatedWill(willId, prov, deleg, user, amount, years);
    });

    it('should not prolong the will before the last 30 days of subscription', async () => {
      const sixty_days = 60 * 24 * 3600;
      let isCaught = false;

      try {
        await TestUtils.gotoFuture(2 * ONE_YEAR - sixty_days);
        txResult = await ewPlatform.prolongWill(willId, 2, { from: user });
      } catch (err) {
          isCaught = true;
      }
      isCaught.should.be.equal(true);
    });

    it('should prolong the will', async () => {
      const fifteen_days = 15 * 24 * 3600;

      await TestUtils.gotoFuture(2 * ONE_YEAR - fifteen_days);
      txResult = await ewPlatform.prolongWill(willId, 2, { from: user });
      const willUpdate = await ewPlatform.wills.call(willId);
      txEvent = TestUtils.findEvent(txResult.logs, 'WillProlonged');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.validTill.should.be.bignumber.equal(willUpdate[9]);
    });
  });

  describe('#refresh an existing will and prolong it', () => {
    const willId = (new BN(prov.slice(2), 16)).iushln(96).iadd(new BN(0x31113e, 16)).toString(10);

    it('should refresh an existing will', async () => {
      const thirty_days = 30 * 24 * 3600;

      await TestUtils.gotoFuture(thirty_days);
      txResult = await ewPlatform.refreshWill(willId, true, { from: deleg });
      txEvent = TestUtils.findEvent(txResult.logs, 'WillRefreshed');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
    });

    it('should prolong an existing will', async () => {
      const fifteen_days = 15 * 24 * 3600;

      await TestUtils.gotoFuture(2 * ONE_YEAR - fifteen_days);
      txResult = await ewPlatform.prolongWill(willId, 2, { from: user });
      const willUpdate = await ewPlatform.wills.call(willId);
      txEvent = TestUtils.findEvent(txResult.logs, 'WillProlonged');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.validTill.should.be.bignumber.equal(willUpdate[9]);
    });
  });

  describe('#after deleted of the will, refresh and prolong it', () => {
    const willId = (new BN(prov.slice(2), 16)).iushln(96).iadd(new BN(0x31113e, 16)).toString(10);

    it('should delete the will', async () => {
      txResult = await ewPlatform.deleteWill(willId, { from: user });
      txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.newState.should.be.bignumber.equal(WillState.Deleted);
    });

    it('should not refresh, after delete the will', async () => {
      const thirty_days = 30 * 24 * 3600;
      let isCaught = false;

      try {
        await TestUtils.gotoFuture(thirty_days);
        txResult = await ewPlatform.refreshWill(willId, true, { from: deleg });
      } catch (err) {
          isCaught = true;
      }
      isCaught.should.be.equal(true);
    });

    it('should not prolong, after delete the will', async () => {
      const fifteen_days = 15 * 24 * 3600;
      let isCaught = false;

      try {
        await TestUtils.gotoFuture(2 * ONE_YEAR - fifteen_days);
        txResult = await ewPlatform.prolongWill(willId, 2, { from: user });
      } catch (err) {
          isCaught = true;
      }
      isCaught.should.be.equal(true);
    });
  });

  describe('#after declined of the will, refresh and prolong it', () => {
    const willId = (new BN(prov.slice(2), 16)).iushln(96).iadd(new BN(0x31112d, 16)).toString(10);

    it('should decline the will', async () => {
      await TestUtils.gotoFuture(2 * ONE_YEAR + 1);
      txResult = await ewPlatform.rejectWill(willId, { from: deleg });
      txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.newState.should.be.bignumber.equal(WillState.Rejected);
    });

    it('should not refresh, after declined the will', async () => {
      const thirty_days = 30 * 24 * 3600;
      let isCaught = false;

      try {
        await TestUtils.gotoFuture(thirty_days);
        txResult = await ewPlatform.refreshWill(willId, true, { from: deleg });
      } catch (err) {
          isCaught = true;
      }
      isCaught.should.be.equal(true);
    });

    it('should not prolong, after declined the will', async () => {
      const fifteen_days = 15 * 24 * 3600;
      let isCaught = false;

      try {
        await TestUtils.gotoFuture(2 * ONE_YEAR - fifteen_days);
        txResult = await ewPlatform.prolongWill(willId, 2, { from: user });
      } catch (err) {
          isCaught = true;
      }
      isCaught.should.be.equal(true);
    });
  });

  describe('#decline the will, when user prolonged the will, 14 months later', () => {
    const willId = (new BN(prov.slice(2), 16)).iushln(96).iadd(new BN(0x31123e, 16)).toString(10);
    const years = 2;

    it('should create and activate the will', async () => {
      await createActivatedWill(willId, prov, deleg, user, amount, years);
    });

    it('should prolong the will, 14 months later', async () => {
      const sixty_days = 60 * 24 * 3600;

      await TestUtils.gotoFuture(2 * ONE_YEAR + sixty_days);
      txResult = await ewPlatform.prolongWill(willId, 2, { from: user });
      const willUpdate = await ewPlatform.wills.call(willId);
      txEvent = TestUtils.findEvent(txResult.logs, 'WillProlonged');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.validTill.should.be.bignumber.equal(willUpdate[9]);
    });

    it('should decline the will', async () => {
      await TestUtils.gotoFuture(2 * ONE_YEAR + 1);
      txResult = await ewPlatform.rejectWill(willId, { from: deleg });
      txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.newState.should.be.bignumber.equal(WillState.Rejected);
    });
  });

  describe('#decline the will, when user prolonged the will in the last month of the year', () => {
    const willId = (new BN(prov.slice(2), 16)).iushln(96).iadd(new BN(0x31323e, 16)).toString(10);
    const years = 2;

    it('should create and activate the will', async () => {
      await createActivatedWill(willId, prov, deleg, user, amount, years);
    });

    it('should prolong the will', async () => {
      const fifteen_days = 15 * 24 * 3600;

      await TestUtils.gotoFuture(2 * ONE_YEAR - fifteen_days);
      txResult = await ewPlatform.prolongWill(willId, 2, { from: user });
      const willUpdate = await ewPlatform.wills.call(willId);
      txEvent = TestUtils.findEvent(txResult.logs, 'WillProlonged');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.validTill.should.be.bignumber.equal(willUpdate[9]);
    });

    it('should not decline, after the renewal of will in the last month of the year', async () => {
      let isCaught = false;

      try {
        await TestUtils.gotoFuture(2 * ONE_YEAR + 1);
        txResult = await ewPlatform.rejectWill(willId, { from: deleg });
      } catch(err) {
        isCaught = true;
      }
      isCaught.should.be.equal(true);
    });
  });

  describe('#user has not refresh the will, but the service does refresh the will', () => {
    const willId = (new BN(prov.slice(2), 16)).iushln(96).iadd(new BN(0x313dead, 16)).toString(10);
    const years = 1;

    it('should create and activate the will', async () => {
      await createActivatedWill(willId, prov, deleg, user, amount, years);
    });

    it('should not refresh the will', async () => {
      let isCaught = false;

      try {
        await TestUtils.gotoFuture(ONE_YEAR);
        txResult = await ewPlatform.refreshWill(willId, true, { from: deleg });
      } catch(err) {
        isCaught = true;
      }
      isCaught.should.be.equal(true);
    });
  });

  describe('#balance of the user and the fund of the provider, after removing the will', () => {
    const willId = (new BN(prov.slice(2), 16)).iushln(96).iadd(new BN(0x314dead, 16)).toString(10);
    const years = 1;

    it('should create and activate the will', async () => {
      await createActivatedWill(willId, prov, deleg, user, amount, years);
    });

    it('should delete the will, further check fund providers and balance users', async () => {
      //todo: test fails
      const bProvider = await ewEscrow.providers.call(prov);
      const bUser = await ewToken.balanceOf(user);
      const forty_days = 40 * 24 * 3600;

      await TestUtils.gotoFuture(forty_days);
      txResult = await ewPlatform.deleteWill(willId, { from: user });
      txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.newState.should.be.bignumber.equal(WillState.Deleted);

      const newBProvider = await ewEscrow.providers.call(prov);

      txResult = newBProvider[1] - bProvider[1];
      txResult.should.be.equal(0);

      txResult = await ewToken.balanceOf(user) - bUser;
      txResult.should.be.equal(RATE_TOKEN * PROVIDER_FEE * 10 / 12);
    });
  });

  describe('#balance of the user and the fund of the provider, after claim the will', () => {
    const willId = (new BN(prov.slice(2), 16)).iushln(96).iadd(new BN(0x315dead, 16)).toString(10);
    const years = 2;

    it('should create and activate the will', async () => {
      await createActivatedWill(willId, prov, deleg, user, amount, years);
    });

    it('should apply the will', async () => {
      txResult = await ewPlatform.applyWill(willId, 0xe4c6, { from: deleg });
      txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.newState.should.be.bignumber.equal(WillState.Pending);
    });

    it('should claim the will, further check fund providers and balance users', async () => {
      //todo: test fails
      const bProvider = await ewEscrow.providers.call(prov);
      const bUser = await ewToken.balanceOf(user);

      await TestUtils.gotoFuture(ONE_YEAR);
      txResult = await ewPlatform.claimWill(willId, { from: benf });
      txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.newState.should.be.bignumber.equal(WillState.Claimed);

      const newBProvider = await ewEscrow.providers.call(prov);

      txResult = newBProvider[1] - bProvider[1];
      txResult.should.be.equal(RATE_TOKEN * PROVIDER_FEE * 12 / 24);

      txResult = await ewToken.balanceOf(user) - bUser;
      txResult.should.be.equal(0);
    });
  });
});
