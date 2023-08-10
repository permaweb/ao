/* eslint-disable */
import fs from 'fs';
import path from 'path';
import { interactRead, readContract } from 'smartweave';
import Arweave from 'arweave';
import { WarpFactory, defaultCacheOptions, defaultWarpGwOptions } from '../../core/WarpFactory';
import { LoggerFactory } from '../../logging/LoggerFactory';
import { SourceType } from '../../core/modules/impl/WarpGatewayInteractionsLoader';
import { DeployPlugin } from 'warp-contracts-plugin-deploy';
import { VM2Plugin } from 'warp-contracts-plugin-vm2';

const stringify = require('safe-stable-stringify');

function* chunks(arr, n) {
  for (let i = 0; i < arr.length; i += n) {
    // note: wrapping with an array to make it compatible with describe.each
    yield [arr.slice(i, i + n)];
  }
}

const arweave = Arweave.init({
  host: 'arweave.net',
  port: 443,
  protocol: 'https',
  timeout: 30000,
  logging: false
});

LoggerFactory.INST.logLevel('fatal');

const testCases: string[] = JSON.parse(fs.readFileSync(path.join(__dirname, 'test-cases/read-state.json'), 'utf-8'));
const testCasesGw: string[] = JSON.parse(fs.readFileSync(path.join(__dirname, 'test-cases/gateways.json'), 'utf-8'));
const testCasesVm: string[] = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'test-cases/read-state-vm.json'), 'utf-8')
);

const chunked: string[][][] = [...chunks(testCases, 10)];
const chunkedGw: string[][][] = [...chunks(testCasesGw, 10)];
const chunkedVm: string[][][] = [...chunks(testCasesVm, 10)];

const originalConsoleLog = console.log;

describe.each(chunked)('v1 compare.suite %#', (contracts: string[]) => {
  // note: concurrent doesn't seem to be working here, duh...
  // will probably need to manually split all the test cases to separate test files
  it.concurrent.each(contracts)(
    '.test %# %o',
    async (contractTxId: string) => {
      const blockHeight = 850127;
      console.log('readContract', contractTxId);
      const resultString = fs
        .readFileSync(path.join(__dirname, 'test-cases', 'contracts', `${contractTxId}.json`), 'utf-8')
        .trim();
      console.log('readState', contractTxId);
      try {
        console.log = function () {}; // to hide any logs from contracts...

        const warp = WarpFactory.custom(
          arweave,
          {
            ...defaultCacheOptions,
            inMemory: true
          },
          'mainnet'
        )
          .useWarpGateway(
            { ...defaultWarpGwOptions, source: SourceType.ARWEAVE, confirmationStatus: null },
            {
              ...defaultCacheOptions,
              inMemory: true
            }
          )
          .build()
          .use(new DeployPlugin());

        const result2 = await warp
          .use(new DeployPlugin())
          .contract(contractTxId)
          .setEvaluationOptions({
            unsafeClient: 'allow',
            allowBigInt: true
          })
          .readState(blockHeight);
        const result2String = stringify(result2.cachedValue.state).trim();

        await warp.stateEvaluator.getCache().prune(1);

        expect(result2String).toEqual(resultString);
      } finally {
        console.log = originalConsoleLog;
        const heap = Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100;
        const rss = Math.round((process.memoryUsage().rss / 1024 / 1024) * 100) / 100;
        console.log('Memory', { heap, rss });
      }
    },
    800000
  );
});

describe.each(chunkedVm)('v1 compare.suite (VM2) %#', (contracts: string[]) => {
  it.concurrent.each(contracts)(
    '.test %# %o',
    async (contractTxId: string) => {
      const blockHeight = 850127;
      console.log('readContract', contractTxId);
      const resultString = fs
        .readFileSync(path.join(__dirname, 'test-cases', 'contracts', `${contractTxId}.json`), 'utf-8')
        .trim();
      console.log('readState', contractTxId);
      const warp = WarpFactory.custom(
        arweave,
        {
          ...defaultCacheOptions,
          inMemory: true
        },
        'mainnet'
      )
        .useWarpGateway(
          { ...defaultWarpGwOptions, source: SourceType.ARWEAVE, confirmationStatus: null },
          {
            ...defaultCacheOptions,
            inMemory: true
          }
        )
        .build()
        .use(new DeployPlugin());

      const result2 = await warp
        .use(new VM2Plugin())
        .contract(contractTxId)
        .setEvaluationOptions({
          unsafeClient: 'allow',
          allowBigInt: true
        })
        .readState(blockHeight);

      const result2String = stringify(result2.cachedValue.state).trim();
      expect(result2String).toEqual(resultString);
    },
    800000
  );
});

/*describe.each(chunkedGw)('gateways compare.suite %#', (contracts: string[]) => {
  // note: concurrent doesn't seem to be working here, duh...
  // will probably need to manually split all the test cases to separate test files
  it.concurrent.each(contracts)(
    '.test %# %o',
    async (contractTxId: string) => {
      const blockHeight = 855134;
      console.log('readState Warp Gateway', contractTxId);
      const warpR = await WarpFactory.custom(
        arweave,
        {
          ...defaultCacheOptions,
          inMemory: true
        },
        'mainnet'
      )
        .useWarpGateway(
          { ...defaultWarpGwOptions, source: SourceType.ARWEAVE, confirmationStatus: null },
          {
            ...defaultCacheOptions,
            inMemory: true
          }
        )
        .build();
      const result = await warpR
        .contract(contractTxId)
        .setEvaluationOptions({
          unsafeClient: 'allow',
          allowBigInt: true
        })
        .readState(blockHeight);
      const resultString = stringify(result.cachedValue.state).trim();

      console.log('readState Arweave Gateway', contractTxId);
      const result2 = await WarpFactory.custom(
        arweave,
        {
          ...defaultCacheOptions,
          inMemory: true
        },
        'mainnet'
      )
        .useArweaveGateway()
        .build()
        .contract(contractTxId)
        .setEvaluationOptions({
          unsafeClient: 'allow',
          allowBigInt: true
        })
        .readState(blockHeight);
      const result2String = stringify(result2.cachedValue.state).trim();
      expect(result2String).toEqual(resultString);
    },
    800000
  );
});*/

describe('readState', () => {
  it('should properly read state at requested block height', async () => {
    const contractTxId = 'CbGCxBJn6jLeezqDl1w3o8oCSeRCb-MmtZNKPodla-0';
    const blockHeight = 707892;
    // note: as any because of types incompatibility between arweave 1.12.x and 1.13.x (smartweave.js has 1.12.x in deps)
    const result = await readContract(arweave as any, contractTxId, blockHeight);
    const resultString = stringify(result).trim();

    const result2 = await WarpFactory.custom(
      arweave,
      {
        ...defaultCacheOptions,
        inMemory: true
      },
      'mainnet'
    )
      .useWarpGateway(
        { ...defaultWarpGwOptions, source: SourceType.ARWEAVE, confirmationStatus: null },
        {
          ...defaultCacheOptions,
          inMemory: true
        }
      )
      .build()
      .use(new DeployPlugin())
      .contract(contractTxId)
      .setEvaluationOptions({
        unsafeClient: 'allow'
      })
      .readState(blockHeight);
    const result2String = stringify(result2.cachedValue.state).trim();

    expect(result2String).toEqual(resultString);
  }, 800000);

  it.skip('should properly check balance of a PST contract', async () => {
    const jwk = await arweave.wallets.generate();
    const contractTxId = '-8A6RexFkpfWwuyVO98wzSFZh0d6VJuI-buTJvlwOJQ';
    const v1Result = await interactRead(arweave as any, jwk, contractTxId, {
      function: 'balance',
      target: '6Z-ifqgVi1jOwMvSNwKWs6ewUEQ0gU9eo4aHYC3rN1M'
    });

    const v2Result = await WarpFactory.custom(
      arweave,
      {
        ...defaultCacheOptions,
        inMemory: true
      },
      'mainnet'
    )
      .useWarpGateway(
        { ...defaultWarpGwOptions, source: SourceType.ARWEAVE, confirmationStatus: null },
        {
          ...defaultCacheOptions,
          inMemory: true
        }
      )
      .build()
      .use(new DeployPlugin())
      .contract(contractTxId)
      .connect(jwk)
      .viewState({
        function: 'balance',
        target: '6Z-ifqgVi1jOwMvSNwKWs6ewUEQ0gU9eo4aHYC3rN1M'
      });

    expect(v1Result).toEqual(v2Result.result);
  }, 800000);
});
