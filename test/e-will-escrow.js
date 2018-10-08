const EWillToken = artifacts.require('EWillToken');
const EWillEscrow = artifacts.require('EWillEscrow');
const TestUtils = require('./test-utils.js');

contract('EWillEscrow', function([admin, user, finance, prov, provwl, provupd, deleg]) {

  const ProviderState = {
    None: 0,
    Pending: 1,
    Whitelisted: 2,
    Activated: 3,
    Banned: 4
  };

  const annualFee = 1500;

  let ewToken = null;
  let ewEscrow = null;
  let txResult, txEvent, isValid;

  async function createActivatedProvider(admin, annualFee, infoId, deleg, prov) {
      await ewToken.transfer(prov, 15.0e+18);
      txResult = await ewEscrow.register(annualFee, infoId, deleg, { from: prov });
      txEvent = TestUtils.findEvent(txResult.logs, 'Registered');
      txResult = await ewEscrow.activateProvider(prov, ProviderState.Activated, { from: admin });
      txEvent = TestUtils.findEvent(txResult.logs, 'Activated');
  }

  describe('#configuration', () => {
    it('should create token', async () => {
      ewToken = await EWillToken.new(1.0e+21);
      await ewToken.transfer(prov, 15.0e+18);
      await ewToken.transfer(user, 15.0e+18);
    });

    it('should have a correct name', async () => {
      ewEscrow = await EWillEscrow.new(ewToken.address, 10);
      await ewToken.addMerchant(ewEscrow.address);

      const name = await ewEscrow.name.call();
      name.should.be.equal('E-will Escrow');
    });

    it('should configure the contract', async () => {
      await ewEscrow.setFinance(finance, { from: admin });
      txResult = await ewEscrow.setMinFund(5, { from: admin });
      const minProviderFund = await ewEscrow.minProviderFund.call();
      minProviderFund.should.be.bignumber.equal(5.0e+18);
    });
  });

  describe('#register and activate provider', () => {
    it('should register a provider', async () => {
      const infoId = 0xdeadbeaf;

      txResult = await ewEscrow.register(annualFee, infoId, deleg, { from: prov });
      txEvent = TestUtils.findEvent(txResult.logs, 'Registered');
      txEvent.args.provider.should.be.bignumber.equal(prov);

      isValid = await ewEscrow.isProviderValid.call(prov);
      isValid.should.be.equal(false);
    });

    it('should activate a provider', async () => {
      txResult = await ewEscrow.activateProvider(prov, ProviderState.Activated, { from: admin });
      txEvent = TestUtils.findEvent(txResult.logs, 'Activated');
      txEvent.args.provider.should.be.bignumber.equal(prov);
      txEvent.args.newState.should.be.bignumber.equal(ProviderState.Activated);

      isValid = await ewEscrow.isProviderValid.call(prov);
      isValid.should.be.equal(false);
    });
  });

  describe('#re-register provider', () => {
    it('should not create and not register provider', async () => {
      const infoId = 0xdeadbeaf;
      let isCaught = false;

      try {
        await createActivatedProvider(admin, annualFee, infoId, deleg, prov);
      } catch(err) {
          isCaught = true;
      }
      isCaught.should.be.equal(true);
    });
  });

  describe('#register and activate whitelist provider', () => {
    it('should whitelist a provider', async () => {
      const infoId = 0x8badfeed;

      txResult = await ewEscrow.register(annualFee, infoId, deleg, { from: provwl });
      txEvent = TestUtils.findEvent(txResult.logs, 'Registered');
      txEvent.args.provider.should.be.bignumber.equal(provwl);

      isValid = await ewEscrow.isProviderValid.call(provwl);
      isValid.should.be.equal(false);
    });

    it('should activate whitelist a provider', async () => {
      txResult = await ewEscrow.activateProvider(provwl, ProviderState.Whitelisted, { from: admin });
      txEvent = TestUtils.findEvent(txResult.logs, 'Activated');
      txEvent.args.provider.should.be.bignumber.equal(provwl);
      txEvent.args.newState.should.be.bignumber.equal(ProviderState.Whitelisted);

      isValid = await ewEscrow.isProviderValid.call(provwl);
      isValid.should.be.equal(true);
    });
  });

  describe('#re-register whitelist provider', () => {
    it('should not create and not register provider', async () => {
      const infoId = 0x8badfeed;
      let isCaught = false;

      try {
        await createActivatedProvider(admin, annualFee, infoId, deleg, provwl);
      } catch(err) {
          isCaught = true;
      }
      isCaught.should.be.equal(true);
    });
  });

  describe('#get min fund for provider', () => {
    it('should check mine fund for provider in whitelist', async () => {
      txResult = await ewEscrow.minFundForProvider.call(provwl);
      txResult.should.be.bignumber.equal(0);
    });

    it('should check mine fund for provider', async () => {
      txResult = await ewEscrow.minFundForProvider.call(prov);
      txResult.should.be.bignumber.equal(await ewEscrow.minProviderFund.call());
    });
  });

  describe('#to top up fund', () => {
    it('should allow to topup funds', async () => {
      const bProvider = await ewToken.balanceOf(prov);
      const amount = 6.0e+18;


      txResult = await ewEscrow.topup(amount, { from: prov });
      txEvent = TestUtils.findEvent(txResult.logs, 'Funded');
      txEvent.args.willId.should.be.bignumber.equal(0);
      txEvent.args.provider.should.be.bignumber.equal(prov);
      txEvent.args.amount.should.be.bignumber.equal(bProvider - await ewToken.balanceOf(prov));

      txResult = await ewEscrow.providers.call(prov);
      txResult[1].should.be.bignumber.equal(bProvider - await ewToken.balanceOf(prov));

      isValid = await ewEscrow.isProviderValid.call(prov);
      isValid.should.be.equal(true);
    });
  });

  describe('#withdraw from the fund', () => {
    it('should allow to withdraw funds', async () => {
      const amount = 2.0e+17;
      const bProvider = await ewToken.balanceOf(prov);

      txResult = await ewEscrow.withdraw(amount, { from: prov });
      txEvent = TestUtils.findEvent(txResult.logs, 'Withdrew');
      txEvent.args.provider.should.be.bignumber.equal(prov);
      txEvent.args.amount.should.be.bignumber.equal(await ewToken.balanceOf(prov) - bProvider);
    });
  });

  describe('#withdraw more funds than there is in the fund', () => {
    it('should not allow to withdraw more funds, than there is', async () => {
      let isCaught = false;

       try {
        txResult = await ewEscrow.withdraw(58.0e+17, { from: prov });
        txEvent = TestUtils.findEvent(txResult.logs, 'Withdrew');
      } catch (err) {
          isCaught = true;
      }
      isCaught.should.be.equal(true);
    });
  });

  describe('#ban and unban provider', () => {
    it('should ban provider', async () => {
      txResult = await ewEscrow.banProvider(prov, { from: admin });
      txEvent = TestUtils.findEvent(txResult.logs, 'Banned');
      txEvent.args.provider.should.be.bignumber.equal(prov);
    });

    it('should check that the provider is banned', async () => {
      txResult = await ewEscrow.providers.call(prov);
      txResult[4].should.be.bignumber.equal(ProviderState.Banned);
    });

    it('should unban provider', async () => {
      txResult = await ewEscrow.unbanProvider(prov, { from: admin });
      txEvent = TestUtils.findEvent(txResult.logs, 'Activated');
      txEvent.args.provider.should.be.bignumber.equal(prov);
      txEvent.args.newState.should.be.bignumber.equal(ProviderState.Activated);
    });

    it('should check that the provider is unbanned', async () => {
      txResult = await ewEscrow.providers.call(prov);
      txResult[4].should.be.bignumber.equal(ProviderState.Activated);
    });
  });

  describe('#ban and unban whitelist provider', () => {
    it('should ban provider', async () => {
      txResult = await ewEscrow.banProvider(provwl, { from: admin });
      txEvent = TestUtils.findEvent(txResult.logs, 'Banned');
      txEvent.args.provider.should.be.bignumber.equal(provwl);
    });

    it('should check that the provider is banned', async () => {
      txResult = await ewEscrow.providers.call(provwl);
      txResult[4].should.be.bignumber.equal(ProviderState.Banned);
    });

    it('should unban provider', async () => {
      txResult = await ewEscrow.unbanProvider(provwl, { from: admin });
      txEvent = TestUtils.findEvent(txResult.logs, 'Activated');
      txEvent.args.provider.should.be.bignumber.equal(provwl);
      txEvent.args.newState.should.be.bignumber.equal(ProviderState.Activated);
    });

    it('should check that the provider is unbanned', async () => {
      txResult = await ewEscrow.providers.call(provwl);
      txResult[4].should.be.bignumber.equal(ProviderState.Activated);
    });
  });

  describe('#update delegate', () => {
    const newDeleg = 0xdeadde1e9;

    it('should allow to change the delegate', async () => {
      txResult = await ewEscrow.changeDelegate(newDeleg, { from: prov });
      txEvent = TestUtils.findEvent(txResult.logs, 'UpdatedDelegate');
      txEvent.args.provider.should.be.bignumber.equal(prov);
      txEvent.args.delegate.should.be.bignumber.equal(newDeleg);
    });

    it('should check update delegate', async () => {
      txResult = await ewEscrow.providerInfo(prov);
      txResult[2].should.be.bignumber.equal(newDeleg);
    });

    it('should check provider address, after update delegate', async () => {
      txResult = await ewEscrow.providerAddress(newDeleg);
      txResult.should.be.bignumber.equal(prov);
    });
  });

  describe('#update provider info', () => {
      const newAnnualFee = 2000;
      const infoId = 0xdeadbeaf1;
      const newInfoId = 0xdead1ee;

    it('should create and register provider', async () => {
      await createActivatedProvider(admin, annualFee, infoId, deleg, provupd);
    });

    it('should allow to topup funds', async () => {
      const bProvider = await ewToken.balanceOf(provupd);
      const amount = 6.0e+18;

      txResult = await ewEscrow.topup(amount, { from: provupd });
      txEvent = TestUtils.findEvent(txResult.logs, 'Funded');
      txEvent.args.willId.should.be.bignumber.equal(0);
      txEvent.args.provider.should.be.bignumber.equal(provupd);
      txEvent.args.amount.should.be.bignumber.equal(bProvider - await ewToken.balanceOf(provupd));
    });

    it('should update info provider', async () => {
      txResult = await ewEscrow.updateProviderInfo(newAnnualFee, newInfoId, { from: provupd });
    });

    it('should check the new provider information', async () => {
      txResult = await ewEscrow.providerInfo(provupd);
      txResult[0].should.be.bignumber.equal(newAnnualFee);
      txResult[1].should.be.bignumber.equal(newInfoId);
      txResult = await ewEscrow.providers.call(provupd);
      txResult[0].should.be.bignumber.equal(newAnnualFee);
      txResult[2].should.be.bignumber.equal(newInfoId);
    });
  });

  describe('#check fund and refund', () => {
    it('should check fund prov', async () => {
      const providers = await ewEscrow.providers.call(prov);
      const amount = 6.0e+18;

      txResult = await ewEscrow.fund(prov, amount, 0, { from: finance });
      txEvent = TestUtils.findEvent(txResult.logs, 'Funded');

      const providersNew = await ewEscrow.providers.call(prov);
      txResult = providersNew[1] - providers[1]; 
      txResult.should.be.bignumber.equal(amount);

    });

    it('should check refund user', async () => {
      const bEscrow = await ewToken.balanceOf(ewEscrow.address);
      const bUser = await ewToken.balanceOf(user);
      const amount = 6.0e+18;

      txResult = await ewEscrow.refund(user, amount, 0, { from: finance });
      txEvent = TestUtils.findEvent(txResult.logs, 'Refunded');

      txResult = await ewToken.balanceOf(user) - bUser;
      txResult.should.be.bignumber.equal(amount);

      txResult = bEscrow - await ewToken.balanceOf(ewEscrow.address);
      txResult.should.be.bignumber.equal(amount);
    });
  });

  describe('#ban provider and try to topup the fund and withdraw money from the fund', () => {
    it('should ban provider', async () => {
      txResult = await ewEscrow.banProvider(prov, { from: admin });
      txEvent = TestUtils.findEvent(txResult.logs, 'Banned');
      txEvent.args.provider.should.be.bignumber.equal(prov);
    });

    it('should check that the provider is banned', async () => {
      txResult = await ewEscrow.providers.call(prov);
      txResult[4].should.be.bignumber.equal(ProviderState.Banned);
    });

    it('should not allow to topup funds', async () => {
      const amount = 6.0e+18;
      let isCaught = false;

      try {
        txResult = await ewEscrow.topup(amount, { from: prov });
        txEvent = TestUtils.findEvent(txResult.logs, 'Funded');
      } catch(err) {
          isCaught = true;
      }
      isCaught.should.be.equal(true);
    });

    it('should not allow to withdraw funds', async () => {
      const amount = 2.0e+17;
      let isCaught = false;

      try {
        txResult = await ewEscrow.withdraw(amount, { from: prov });
        txEvent = TestUtils.findEvent(txResult.logs, 'Withdrew');
      } catch(err) {
          isCaught = true;
      }
      isCaught.should.be.equal(true);
    });
  });

  describe('#banned provider trying to update delegate', () => {
    const deleg = 0xdeadde1e9;
    const newDeleg = 0xdeadde1;

    it('should not allow to change delegate', async () => {
      let isCaught = false;

      try {
        txResult = await ewEscrow.changeDelegate(newDeleg, { from: prov });
        txEvent = TestUtils.findEvent(txResult.logs, 'UpdatedDelegate');
      } catch(err) {
          isCaught = true;
      }
      isCaught.should.be.equal(true);
    });

    it('should check delegate', async () => {
      txResult = await ewEscrow.providerInfo(prov);
      txResult[2].should.be.bignumber.equal(deleg);
    });

    it('should check provider address, after update delegate', async () => {
      txResult = await ewEscrow.providerAddress(deleg);
      txResult.should.be.bignumber.equal(prov);
    });
  });

  describe('#banned provider trying to update data', () => {
      const newAnnualFee = 2500;
      const infoId = 0xdeadbeaf2;
      const newInfoId = 0xdead1e2;

    it('should not update info provider', async () => {
      let isCaught = false;

      try {
        txResult = await ewEscrow.updateProviderInfo(newAnnualFee, newInfoId, { from: prov });
      } catch(err) {
          isCaught = true;
      }
      isCaught.should.be.equal(true);
    });
  });

  describe('#registering a banned provider', () => {
    it('should not create and not register provider', async () => {
      const infoId = 0xdeadbeaf;
      let isCaught = false;

      try {
        await createActivatedProvider(admin, annualFee, infoId, deleg, prov);
      } catch(err) {
          isCaught = true;
      }
      isCaught.should.be.equal(true);
    });
  });

  describe('#to repeat ban provider and unban provider', () => {
    it('should ban provider', async () => {
      let isCaught = false;

      try {
        txResult = await ewEscrow.banProvider(prov, { from: admin });
      } catch(err) {
          isCaught = true;
      }
      isCaught.should.be.equal(true);
    });

    it('should unban provider', async () => {
      txResult = await ewEscrow.unbanProvider(prov, { from: admin });
      txEvent = TestUtils.findEvent(txResult.logs, 'Activated');
      txEvent.args.provider.should.be.bignumber.equal(prov);
      txEvent.args.newState.should.be.bignumber.equal(ProviderState.Activated);
    });

    it('should check that the provider is unbanned', async () => {
      txResult = await ewEscrow.providers.call(prov);
      txResult[4].should.be.bignumber.equal(ProviderState.Activated);
    });
  });
});
