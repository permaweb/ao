import Arweave from 'arweave';
import { DefinitionLoader } from './modules/DefinitionLoader';
import { ExecutorFactory } from './modules/ExecutorFactory';
import { HandlerApi } from './modules/impl/HandlerExecutorFactory';
import { InteractionsLoader } from './modules/InteractionsLoader';
import { StateEvaluator, EvalStateResult } from './modules/StateEvaluator';
import { WarpEnvironment, Warp } from './Warp';
import { CacheOptions, GatewayOptions } from './WarpFactory';
import { BasicSortKeyCache } from '../cache/BasicSortKeyCache';
export declare class WarpBuilder {
    private readonly _arweave;
    private readonly _stateCache;
    private readonly _environment;
    private _definitionLoader?;
    private _interactionsLoader?;
    private _executorFactory?;
    private _stateEvaluator?;
    constructor(_arweave: Arweave, _stateCache: BasicSortKeyCache<EvalStateResult<unknown>>, _environment?: WarpEnvironment);
    setDefinitionLoader(value: DefinitionLoader): WarpBuilder;
    setInteractionsLoader(value: InteractionsLoader): WarpBuilder;
    setExecutorFactory(value: ExecutorFactory<HandlerApi<unknown>>): WarpBuilder;
    setStateEvaluator(value: StateEvaluator): WarpBuilder;
    overwriteSource(sourceCode: {
        [key: string]: string;
    }): Warp;
    useWarpGateway(gatewayOptions: GatewayOptions, cacheOptions: CacheOptions): WarpBuilder;
    useArweaveGateway(): WarpBuilder;
    build(): Warp;
}
//# sourceMappingURL=WarpBuilder.d.ts.map