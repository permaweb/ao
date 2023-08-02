const { LoggerFactory } = require('warp-contracts');

module.exports = (name) => {
  const level = 'info';
  LoggerFactory.INST.logLevel(level);

  const logger = LoggerFactory.INST.create(name);
  LoggerFactory.INST.logLevel(level, 'listener');
  LoggerFactory.INST.logLevel(level, 'interactionsProcessor');
  LoggerFactory.INST.logLevel(level, 'contractsProcessor');
  return logger;
};
