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

  let ewPlatform = null;
  let ewFinance = null;
  let ewAccount = null;
  let ewEscrow = null;
  let ewToken = null;
  let txResult, txEvent;

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
      await ewToken.transfer(user, 15.0e+18);
      await ewToken.transfer(prov, 150.0e+18);
      await ewToken.transfer(ewFinance.address, 5.0e+21);

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

      const annualPlatformFee = await ewFinance.annualPlatformFee.call();
      annualPlatformFee.should.be.bignumber.equal('500');

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
      let benHash = (new BN(benf.slice(2), 16)).toBuffer();
      benHash = new BN(keccak256(benHash), 16);

      txResult = await ewPlatform.createWill('Test will for EV', willId, 0x5108a9e, 2, benHash.toString(10), prov, '0' /*todo: referrer*/, { from: user, value: 20.0e+15 });
      txEvent = TestUtils.findEvent(txResult.logs, 'WillCreated');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.provider.should.be.bignumber.equal(prov);
      txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.newState.should.be.bignumber.equal(WillState.Created);

      const will = await ewPlatform.wills.call(willId);
      will[11].should.be.equal('Test will for EV');
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

    it('should create a will', async () => {
      let benHash = (new BN(benf.slice(2), 16)).toBuffer();
      benHash = new BN(keccak256(benHash), 16);

      txResult = await ewPlatform.createWill('Test will for EV', willId, 0x5108a9e, 2, benHash.toString(10), prov, '0' /*todo: referrer*/, { from: user, value: 20.0e+15 });
      txEvent = TestUtils.findEvent(txResult.logs, 'WillCreated');

      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.provider.should.be.bignumber.equal(prov);
      txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.newState.should.be.bignumber.equal(WillState.Created);
    });

    it('should activate the will', async () => {
      txResult = await ewPlatform.activateWill(willId, { from: deleg });
      txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.newState.should.be.bignumber.equal(WillState.Activated);
    });

    it('should not decline the will', async () => {
      let isCaught = false;
      try {
        txResult = await ewPlatform.rejectWill(willId, { from: deleg });
        txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
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

    it('should create a will', async () => {
      let benHash = (new BN(benf.slice(2), 16)).toBuffer();
      benHash = new BN(keccak256(benHash), 16);

      txResult = await ewPlatform.createWill('Test will for EV', willId, 0x5108a9e, 2, benHash.toString(10), prov, '0' /*todo: referrer*/, { from: user, value: 20.0e+15 });
      txEvent = TestUtils.findEvent(txResult.logs, 'WillCreated');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.provider.should.be.bignumber.equal(prov);
      txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.newState.should.be.bignumber.equal(WillState.Created);
    });

    it('should activate the will', async () => {
      txResult = await ewPlatform.activateWill(willId, { from: deleg });
      txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.newState.should.be.bignumber.equal(WillState.Activated);
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

  describe('#delegate refresh the will', () => {
    const willId = (new BN(prov.slice(2), 16)).iushln(96).iadd(new BN(0x31112d, 16)).toString(10);

    it('should create a will', async () => {
      let benHash = (new BN(benf.slice(2), 16)).toBuffer();
      benHash = new BN(keccak256(benHash), 16);

      txResult = await ewPlatform.createWill('Test will for EV', willId, 0x5108a9e, 2, benHash.toString(10), prov, '0' /*todo: referrer*/, { from: user, value: 20.0e+15 });
      txEvent = TestUtils.findEvent(txResult.logs, 'WillCreated');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.provider.should.be.bignumber.equal(prov);
      txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.newState.should.be.bignumber.equal(WillState.Created);
    });

    it('should activate the will', async () => {
      txResult = await ewPlatform.activateWill(willId, { from: deleg });
      txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.newState.should.be.bignumber.equal(WillState.Activated);
    });

    it('should not refresh the will', async () => {
      const twenty_nine_days = 701 * 24 * 3600;
      let isCaught = false;

      try {
        await TestUtils.gotoFuture(2 * ONE_YEAR - twenty_nine_days);
        txResult = await ewPlatform.refreshWill(willId, { from: deleg });
        txEvent = TestUtils.findEvent(txResult.logs, 'WillRefreshed');
      } catch (err) {
        isCaught = true;
      }
      isCaught.should.be.equal(true);
    });

    it('should refresh the will', async () => {
      const thirty_days = 700 * 24 * 3600;

      await TestUtils.gotoFuture(2 * ONE_YEAR - thirty_days);
      txResult = await ewPlatform.refreshWill(willId, { from: deleg });
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

    it('should create a will', async () => {
      let benHash = (new BN(benf.slice(2), 16)).toBuffer();
      benHash = new BN(keccak256(benHash), 16);

      txResult = await ewPlatform.createWill('Test will for EV', willId, 0x5108a9e, 2, benHash.toString(10), prov, '0' /*todo: referrer*/, { from: user, value: 20.0e+15 });
      txEvent = TestUtils.findEvent(txResult.logs, 'WillCreated');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.provider.should.be.bignumber.equal(prov);
      txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.newState.should.be.bignumber.equal(WillState.Created);
    });

    it('should activate the will', async () => {
      txResult = await ewPlatform.activateWill(willId, { from: deleg });
      txEvent = TestUtils.findEvent(txResult.logs, 'WillStateUpdated');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.newState.should.be.bignumber.equal(WillState.Activated);
    });

    it('should not prolong the will', async () => {
      const sixty_minus = 60 * 24 * 3600;
      const will = await ewPlatform.wills.call(willId);
      isCaught = false;

      try {
        await TestUtils.gotoFuture(2 * ONE_YEAR - sixty_minus);
        txResult = await ewPlatform.prolongWill(willId, 2, { from: user });
        txEvent = TestUtils.findEvent(txResult.logs, 'WillProlonged');
      } catch (err) {
        isCaught = true;
      }
      isCaught.should.be.equal(true);
    });

    it('should prolong the will', async () => {
      const fifteen_minus = 15 * 24 * 3600;

      await TestUtils.gotoFuture(2 * ONE_YEAR - fifteen_minus);
      txResult = await ewPlatform.prolongWill(willId, 2, { from: user });
      const willUpdate = await ewPlatform.wills.call(willId);
      txEvent = TestUtils.findEvent(txResult.logs, 'WillProlonged');
      txEvent.args.willId.should.be.bignumber.equal(willId);
      txEvent.args.owner.should.be.bignumber.equal(user);
      txEvent.args.validTill.should.be.bignumber.equal(willUpdate[9]);
    });
  });
});