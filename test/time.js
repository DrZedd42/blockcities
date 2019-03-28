// const {ethGetBlock} = require('./web3');
const pify = require('pify');

function advanceBlock() {
  return new Promise((resolve, reject) => {
    web3.currentProvider.send({
      jsonrpc: '2.0',
      method: 'evm_mine',
      id: Date.now(),
    }, (err, res) => {
      return err ? reject(err) : resolve(res);
    });
  });
}

// Advances the block number so that the last mined block is `number`.
async function advanceToBlock(number) {
  if (web3.eth.blockNumber > number) {
    throw Error(`block number ${number} is in the past (current is ${web3.eth.blockNumber})`);
  }
  while (web3.eth.blockNumber < number) {
    await advanceBlock();
  }
}

// Increases ganache time by the passed duration in seconds
async function increase(duration) {
  if (duration < 0) throw Error(`Cannot increase time by a negative amount (${duration})`);

  await pify(web3.currentProvider.send)({
    jsonrpc: '2.0',
    method: 'evm_increaseTime',
    params: [duration],
  });

  await advanceBlock();
}

/**
 * Beware that due to the need of calling two separate ganache methods and rpc calls overhead
 * it's hard to increase time precisely to a target point so design your test to tolerate
 * small fluctuations from time to time.
 *
 * @param target time in seconds
 */
async function increaseTo(target) {
  const now = (await latest());

  if (target < now) throw Error(`Cannot increase current time (${now}) to a moment in the past (${target})`);
  const diff = target - now;
  return increase(diff);
}

const duration = {
  seconds: function (val) {
    return val;
  },
  minutes: function (val) {
    return val * this.seconds(60);
  },
  hours: function (val) {
    return val * this.minutes(60);
  },
  days: function (val) {
    return val * this.hours(24);
  },
  weeks: function (val) {
    return val * this.days(7);
  },
  years: function (val) {
    return val * this.days(365);
  },
};

module.exports = {
  advanceBlock,
  advanceToBlock,
  increase,
  increaseTo,
  duration,
};
