/* eslint-disable */
const { LmdbCache } = require('warp-contracts-lmdb');
const { defaultCacheOptions, SrcCache, ContractCache, ContractDefinition } = require('warp-contracts');

const commandLineArgs = require('command-line-args');
const cliProgress = require('cli-progress');
const optionDefinitions = [
  { name: 'inContracts', type: String, alias: 'i' },
  { name: 'outContracts', type: String, alias: 'c' },
  { name: 'outSource', type: String, alias: 's' },
];

// Contract cache was divided in Warp into:
// - contracts (path: /contracts) 
// - sources (path: /source) 
// in order to de-duplicate sources.
// This script:
// - goes through all contracts
// - saves sources to dedicated cache
// - saves contracts to dedicated cache
async function main() {
  const args = commandLineArgs(optionDefinitions);
  if (args.inContracts === args.outContracts) {
    console.error("Input and output contracts folders can't be the same");
    return;
  }

  const inContracts = new LmdbCache({ ...defaultCacheOptions, dbLocation: args.inContracts }).storage();
  const outContracts = new LmdbCache({ ...defaultCacheOptions, dbLocation: args.outContracts }).storage();
  const outSource = new LmdbCache({ ...defaultCacheOptions, dbLocation: args.outSource }).storage();

  const bar = new cliProgress.SingleBar(
    {
      etaBuffer: 1000
    },
    cliProgress.Presets.shades_classic
  );
  bar.start(inContracts.getKeysCount(), 0);

  inContracts.transactionSync(() => {
    inContracts.getRange().forEach(({ key, value }: any) => {
      const v = value as typeof ContractDefinition
      const k = key as string
      let srcTxId: string = k
      if (k.charAt(43) === "_") {
        srcTxId = k.substring(44)
      }
      srcTxId = srcTxId.replace("|cd", "|src")

      outContracts.putSync(key, new ContractCache(v))
      outSource.putSync(srcTxId, new SrcCache(v))

      bar.increment();
    });
  });

  await inContracts.close()
  await outContracts.close()
  await outSource.close()

  bar.stop();
}

main().catch((e) => console.error(e));
