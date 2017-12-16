TestUtils = {};

TestUtils.findEvent = (logs, eventName) => {
  let result = null;
  for (let idx = 0; idx < logs.length; idx++) {
    const log = logs[idx];
    if (log.event === eventName) {
      result = log;
      break;
    }
  }
  return result;
};

TestUtils.timeout = ms => new Promise(res => setTimeout(res, ms));

module.exports = TestUtils;
