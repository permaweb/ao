import { ArweaveGatewayBundledContractDefinitionLoader } from '../../core/modules/impl/ArweaveGatewayBundledContractDefinitionLoader';
import { ArweaveGatewayBundledInteractionLoader } from '../../core/modules/impl/ArweaveGatewayBundledInteractionLoader';
import { SourceType, WarpGatewayInteractionsLoader } from '../../core/modules/impl/WarpGatewayInteractionsLoader';
import { EvaluationOptions } from '../../core/modules/StateEvaluator';
import { WarpFactory } from '../../core/WarpFactory';
import { LoggerFactory } from '../../logging/LoggerFactory';
import { WarpGatewayContractDefinitionLoader } from '../../core/modules/impl/WarpGatewayContractDefinitionLoader';
import { LevelDbCache } from '../../cache/impl/LevelDbCache';
import { ContractCache, SrcCache } from '../../core/ContractDefinition';
import stringify from 'safe-stable-stringify';
import Arweave from 'arweave/node/common';

const EXAMPLE_CONTRACT_TX_ID = 'T8Fakv0Sol6ALQ4Mt6FTxEJVDJWT-HDUmcI3qIA49U4';
const EXAMPLE_CONTRACT_SRC_TX_ID = 'QEIweYIpdMSer_E33VreYzmuTIx33FQ4Sq32XJqlLQw';
const START_SORT_KEY = '000001113783,1675726148250,1bc0b0282f4721c4ba3a301c458c446d85b0e4fce6d17a462676dc53191f7e51';
const END_SORT_KEY = '000001133615,1678274445537,9e891019def7bc0315eed4419e24c410323c3ea8d735c985a18ad6477d4107ed';
jest.setTimeout(300_000);
LoggerFactory.INST.logLevel('fatal');

describe('Arweave Gateway interaction loader', () => {
  describe('mainnet', () => {
    describe('Contract definition loading', () => {
      it('should load contract source', async () => {
        const warp = WarpFactory.forMainnet();

        const arLoader = new ArweaveGatewayBundledContractDefinitionLoader(warp.environment);
        arLoader.warp = warp;

        const arSrc = await arLoader.loadContractSource(EXAMPLE_CONTRACT_SRC_TX_ID);
        expect(arSrc).toBeDefined();
      });

      it('should load contract definition', async () => {
        const warp = WarpFactory.forMainnet();

        const contractsCache = new LevelDbCache<ContractCache<unknown>>({
          inMemory: true,
          dbLocation: ''
        });

        // Separate cache for sources to minimize duplicates
        const sourceCache = new LevelDbCache<SrcCache>({
          inMemory: true,
          dbLocation: ''
        });

        const wrLoader = new WarpGatewayContractDefinitionLoader(
          warp.arweave,
          contractsCache,
          sourceCache,
          warp.environment
        );
        wrLoader.warp = warp;

        const arLoader = new ArweaveGatewayBundledContractDefinitionLoader(warp.environment);
        arLoader.warp = warp;

        const arContract = await arLoader.load(EXAMPLE_CONTRACT_TX_ID);
        const wrContract = await wrLoader.load(EXAMPLE_CONTRACT_TX_ID);

        expect(stringify(arContract.contractTx.tags)).toEqual(stringify(wrContract.contractTx.tags));
        expect(stringify(arContract.srcTx)).toEqual(stringify(wrContract.srcTx));
        expect(arContract.src).toEqual(wrContract.src);
        expect(arContract.initState).toEqual(wrContract.initState);
      });
    });

    describe('Sequenced by warp sequencer', () => {
      test('warp loader and arweave loader load interactions with same sortKey', async () => {
        const warp = WarpFactory.forMainnet();
        const arweaveLoader = new ArweaveGatewayBundledInteractionLoader(warp.arweave, warp.environment);
        arweaveLoader.warp = warp;
        const arTxs = await arweaveLoader.load(EXAMPLE_CONTRACT_TX_ID, START_SORT_KEY, END_SORT_KEY, {
          internalWrites: true
        } as EvaluationOptions);
        const warpLoader = new WarpGatewayInteractionsLoader({}, SourceType.WARP_SEQUENCER);
        warpLoader.warp = warp;
        const wrTxs = await warpLoader.load(EXAMPLE_CONTRACT_TX_ID, START_SORT_KEY, END_SORT_KEY);
        const missingTxsOnAr = wrTxs.filter((wr) => !arTxs.map((ar) => ar.sortKey).includes(wr.sortKey));
        expect(missingTxsOnAr.length).toBe(0);
      });

      test('warp loader and arweave loader load interactions without sortkey', async () => {
        const warp = WarpFactory.forMainnet();
        const arweaveLoader = new ArweaveGatewayBundledInteractionLoader(warp.arweave, warp.environment);
        arweaveLoader.warp = warp;
        const arTxs = await arweaveLoader.load(EXAMPLE_CONTRACT_TX_ID, undefined, undefined, {} as EvaluationOptions);
        const warpLoader = new WarpGatewayInteractionsLoader({}, SourceType.WARP_SEQUENCER);
        warpLoader.warp = warp;
        const wrTxs = await warpLoader.load(EXAMPLE_CONTRACT_TX_ID, undefined, undefined);

        const missingTxsOnAr = wrTxs.filter((wr) => !arTxs.map((ar) => ar.sortKey).includes(wr.sortKey));
        expect(wrTxs.length).toBe(wrTxs.length);
        expect(missingTxsOnAr.length).toBe(0);

        const arSortKeys = arTxs.map((a) => a.sortKey);
        const wrSortKeys = wrTxs.map((w) => w.sortKey);

        expect(arSortKeys).toEqual(wrSortKeys);
      });

      it('warp interaction loader and arweave interaction loader evaluates to same state', async () => {
        const contractsCache = new LevelDbCache<ContractCache<unknown>>({
          inMemory: true,
          dbLocation: ''
        });

        // Separate cache for sources to minimize duplicates
        const sourceCache = new LevelDbCache<SrcCache>({
          inMemory: true,
          dbLocation: ''
        });

        const arweave = Arweave.init({ host: 'arweave.net', port: 443, protocol: 'https' });

        const arLoader = new ArweaveGatewayBundledInteractionLoader(arweave, 'mainnet');
        const wrLoader = new WarpGatewayContractDefinitionLoader(arweave, contractsCache, sourceCache, 'mainnet');
        const withArLoader = WarpFactory.custom(arweave, { inMemory: true, dbLocation: '' }, 'mainnet')
          .setInteractionsLoader(arLoader)
          .setDefinitionLoader(wrLoader)
          .build();
        arLoader.warp = withArLoader;
        wrLoader.warp = withArLoader;

        const arResult = await withArLoader
          .contract(EXAMPLE_CONTRACT_TX_ID)
          .setEvaluationOptions({ allowBigInt: true })
          .readState();

        // warp
        const withWrLoader = WarpFactory.forMainnet({ inMemory: true, dbLocation: '' });
        const wrResult = await withWrLoader
          .contract(EXAMPLE_CONTRACT_TX_ID)
          .setEvaluationOptions({ allowBigInt: true })
          .readState();

        expect(JSON.stringify(arResult.cachedValue.state)).toEqual(JSON.stringify(wrResult.cachedValue.state));
      });

      it('warp interaction, contract definition loader and arweave interaction, contract definition loader evaluates to same state ', async () => {
        const arweave = Arweave.init({ host: 'arweave.net', port: 443, protocol: 'https' });

        const arInteractionsLoader = new ArweaveGatewayBundledInteractionLoader(arweave, 'mainnet');
        const arContractLoader = new ArweaveGatewayBundledContractDefinitionLoader('mainnet');

        const withArLoader = WarpFactory.custom(arweave, { inMemory: true, dbLocation: '' }, 'mainnet')
          .setInteractionsLoader(arInteractionsLoader)
          .setDefinitionLoader(arContractLoader)
          .build();

        arInteractionsLoader.warp = withArLoader;
        arContractLoader.warp = withArLoader;

        const arResult = await withArLoader
          .contract(EXAMPLE_CONTRACT_TX_ID)
          .setEvaluationOptions({ allowBigInt: true })
          .readState();

        // warp
        const withWrLoader = WarpFactory.forMainnet({ inMemory: true, dbLocation: '' });
        const wrResult = await withWrLoader
          .contract(EXAMPLE_CONTRACT_TX_ID)
          .setEvaluationOptions({ allowBigInt: true })
          .readState();

        expect(stringify(arResult.cachedValue.state)).toEqual(stringify(wrResult.cachedValue.state));
      });
    });
  });
});
