/* eslint-disable */
const { LmdbCache } = require('warp-contracts-lmdb');
const { defaultCacheOptions } = require('warp-contracts');

const commandLineArgs = require('command-line-args');
const cliProgress = require('cli-progress');

process.on('uncaughtException', (error) => {
  console.error(`Uncaught exception: ${error}`);
  if (error.stack) console.error(error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error(`Promise rejection: ${error}`);
  if (error.stack) console.error(error.stack);
  process.exit(1);
});

const optionDefinitions = [
  { name: 'input', type: String, alias: 'i' },
  { name: 'output', type: String, alias: 'o' }
];

async function main() {
  const args = commandLineArgs(optionDefinitions);
  if (args.input === args.output) {
    console.error("Input and output folders can't be the same");
    return;
  }

  console.log('Rewriting LMDB cache to another LMDB cache');
  console.log('Heap stats:', require('v8').getHeapStatistics());

  const input = new LmdbCache({ ...defaultCacheOptions, dbLocation: args.input }).storage();
  const output = new LmdbCache({ ...defaultCacheOptions, dbLocation: args.output }).storage();

  const bar = new cliProgress.SingleBar(
    {
      etaBuffer: 1000
    },
    cliProgress.Presets.shades_classic
  );
  bar.start(input.getKeysCount(), 0);

  input.transactionSync(() => {
    input.getRange({ snapshot: true }).forEach(({ key, value }) => {
      output.putSync(key, value);
      bar.increment();
    });
  });

  bar.stop();
}

main().catch((e) => console.error(e));
