import Arweave from 'arweave';
import { LevelDbCache } from '../cache/impl/LevelDbCache';
import { Evolve } from '../plugins/Evolve';
import { CacheableStateEvaluator } from './modules/impl/CacheableStateEvaluator';
import { HandlerExecutorFactory } from './modules/impl/HandlerExecutorFactory';
import { ConfirmationStatus, SourceType } from './modules/impl/WarpGatewayInteractionsLoader';
import { EvalStateResult } from './modules/StateEvaluator';
import { WarpEnvironment, Warp } from './Warp';
import { WarpBuilder } from './WarpBuilder';

export type GatewayOptions = {
  confirmationStatus: ConfirmationStatus;
  source: SourceType;
};

export type CacheOptions = {
  inMemory: boolean;
  dbLocation: string;
  subLevelSeparator?: string | undefined;
};

export const defaultWarpGwOptions: GatewayOptions = {
  confirmationStatus: { notCorrupted: true },
  source: SourceType.BOTH
};

/**
 * @Deprecated - will be removed soon, left for backwards compatibility with deploy plugin
 */
export const WARP_GW_URL = 'https://gw.warp.cc';

export const DEFAULT_LEVEL_DB_LOCATION = './cache/warp';

export const defaultCacheOptions: CacheOptions = {
  inMemory: false,
  dbLocation: DEFAULT_LEVEL_DB_LOCATION
};

/**
 * A factory that simplifies the process of creating different versions of {@link Warp}.
 * All versions use the {@link Evolve} plugin.
 */
export class WarpFactory {
  /**
   * creates a Warp instance suitable for testing in a local environment
   * (e.g. usually using ArLocal)
   * @param arweave - an instance of Arweave
   * @param cacheOptions - optional cache options. By default, the in-memory cache is used.
   */
  static forLocal(
    port = 1984,
    arweave = Arweave.init({
      host: 'localhost',
      port: port,
      protocol: 'http'
    }),
    cacheOptions = {
      ...defaultCacheOptions,
      inMemory: true
    }
  ): Warp {
    return this.customArweaveGw(arweave, cacheOptions, 'local');
  }

  /**
   * creates a Warp instance suitable for testing
   * with Warp testnet (https://testnet.redstone.tools/)
   */
  static forTestnet(
    cacheOptions = defaultCacheOptions,
    useArweaveGw = false,
    arweave = Arweave.init({
      host: 'arweave.net',
      port: 443,
      protocol: 'https'
    })
  ): Warp {
    if (useArweaveGw) {
      return this.customArweaveGw(arweave, cacheOptions, 'testnet');
    } else {
      return this.customWarpGw(arweave, defaultWarpGwOptions, cacheOptions, 'testnet');
    }
  }

  /**
   * creates a Warp instance suitable for use with mainnet.
   * By default, the Warp gateway (https://github.com/warp-contracts/gateway#warp-gateway)
   * is being used for:
   * 1. deploying contracts
   * 2. writing new transactions through Warp Sequencer
   * 3. loading contract interactions
   *
   * @param cacheOptions - cache options, defaults {@link defaultCacheOptions}
   * @param useArweaveGw - use arweave.net gateway for deploying contracts,
   * writing and loading interactions
   * @param arweave - custom Arweave instance
   */
  static forMainnet(
    cacheOptions = defaultCacheOptions,
    useArweaveGw = false,
    arweave = Arweave.init({
      host: 'arweave.net',
      port: 443,
      protocol: 'https'
    })
  ): Warp {
    if (useArweaveGw) {
      return this.customArweaveGw(arweave, cacheOptions, 'mainnet');
    } else {
      return this.customWarpGw(arweave, defaultWarpGwOptions, cacheOptions, 'mainnet');
    }
  }
  /**
   * returns an instance of {@link WarpBuilder} that allows to fully customize the Warp instance.
   * @param arweave
   * @param cacheOptions
   */
  static custom(arweave: Arweave, cacheOptions: CacheOptions, environment: WarpEnvironment): WarpBuilder {
    const stateCache = new LevelDbCache<EvalStateResult<unknown>>({
      ...cacheOptions,
      dbLocation: `${cacheOptions.dbLocation}/state`
    });

    const executorFactory = new HandlerExecutorFactory(arweave);
    const stateEvaluator = new CacheableStateEvaluator(arweave, stateCache, [new Evolve()]);

    return Warp.builder(arweave, stateCache, environment)
      .setExecutorFactory(executorFactory)
      .setStateEvaluator(stateEvaluator);
  }

  private static customArweaveGw(
    arweave: Arweave,
    cacheOptions: CacheOptions = defaultCacheOptions,
    environment: WarpEnvironment
  ): Warp {
    return this.custom(arweave, cacheOptions, environment).useArweaveGateway().build();
  }

  private static customWarpGw(
    arweave: Arweave,
    gatewayOptions: GatewayOptions = defaultWarpGwOptions,
    cacheOptions: CacheOptions = defaultCacheOptions,
    environment: WarpEnvironment
  ): Warp {
    return this.custom(arweave, cacheOptions, environment).useWarpGateway(gatewayOptions, cacheOptions).build();
  }
}
