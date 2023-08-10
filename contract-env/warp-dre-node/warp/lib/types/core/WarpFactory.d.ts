import Arweave from 'arweave';
import { ConfirmationStatus, SourceType } from './modules/impl/WarpGatewayInteractionsLoader';
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
export declare const defaultWarpGwOptions: GatewayOptions;
/**
 * @Deprecated - will be removed soon, left for backwards compatibility with deploy plugin
 */
export declare const WARP_GW_URL = "https://gw.warp.cc";
export declare const DEFAULT_LEVEL_DB_LOCATION = "./cache/warp";
export declare const defaultCacheOptions: CacheOptions;
/**
 * A factory that simplifies the process of creating different versions of {@link Warp}.
 * All versions use the {@link Evolve} plugin.
 */
export declare class WarpFactory {
    /**
     * creates a Warp instance suitable for testing in a local environment
     * (e.g. usually using ArLocal)
     * @param arweave - an instance of Arweave
     * @param cacheOptions - optional cache options. By default, the in-memory cache is used.
     */
    static forLocal(port?: number, arweave?: Arweave, cacheOptions?: {
        inMemory: boolean;
        dbLocation: string;
        subLevelSeparator?: string;
    }): Warp;
    /**
     * creates a Warp instance suitable for testing
     * with Warp testnet (https://testnet.redstone.tools/)
     */
    static forTestnet(cacheOptions?: CacheOptions, useArweaveGw?: boolean, arweave?: Arweave): Warp;
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
    static forMainnet(cacheOptions?: CacheOptions, useArweaveGw?: boolean, arweave?: Arweave): Warp;
    /**
     * returns an instance of {@link WarpBuilder} that allows to fully customize the Warp instance.
     * @param arweave
     * @param cacheOptions
     */
    static custom(arweave: Arweave, cacheOptions: CacheOptions, environment: WarpEnvironment): WarpBuilder;
    private static customArweaveGw;
    private static customWarpGw;
}
//# sourceMappingURL=WarpFactory.d.ts.map