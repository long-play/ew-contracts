TestUtils = {};

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
