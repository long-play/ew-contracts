TestUtils = {};

const advanceTime = (time) => {
  const promise = new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync({
      jsonrpc: "2.0",
      method: "evm_increaseTime",
      params: [time],
      id: new Date().getTime()
    }, (err, result) => {
      if (err) { return reject(err); }
      return resolve(result);
    });
  });
  return promise;
};

const advanceBlock = () => {
  const promise = new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync({
      jsonrpc: "2.0",
      method: "evm_mine",
      id: new Date().getTime()
    }, (err, result) => {
      if (err) { return reject(err); }
      const newBlockHash = web3.eth.getBlock('latest').hash;

      return resolve(newBlockHash)
    });
  });
  return promise;
};

TestUtils.gotoFuture = (time) => {
  const promise = advanceTime(time).then( () => {
    return advanceBlock();
  }).then( () => {
    return Promise.resolve(web3.eth.getBlock('latest'));
  });
  return promise;
};

TestUtils.now = () => {
  return web3.eth.getBlock('latest').timestamp;
};

TestUtils.getBalance = (acc) => {
  const promise = new Promise( (resolve, reject) => {
    web3.eth.getBalance(acc, (err, balance) => {
      if (err) reject(err);
      else resolve(balance);
    });
  });
  return promise;
};

TestUtils.findEvent = (logs, eventName) => {
  let result = null;
  for (let log of logs) {
    if (log.event === eventName) {
      result = log;
      break;
    }
  }
  return result;
};

TestUtils.timeout = ms => new Promise(res => setTimeout(res, ms));

module.exports = TestUtils;
