import { GQLNodeInterface } from '../../../legacy/gqlResult';
import 'warp-isomorphic';
import { GW_TYPE, InteractionsLoader } from '../InteractionsLoader';
import { EvaluationOptions } from '../StateEvaluator';
import { Warp } from '../../Warp';
export type ConfirmationStatus = {
    notCorrupted?: boolean;
    confirmed?: null;
} | {
    notCorrupted?: null;
    confirmed?: boolean;
};
export declare const enum SourceType {
    ARWEAVE = "arweave",
    WARP_SEQUENCER = "redstone-sequencer",
    BOTH = "both"
}
/**
 * The aim of this implementation of the {@link InteractionsLoader} is to make use of
 * Warp Gateway ({@link https://github.com/redstone-finance/redstone-sw-gateway})
 * endpoint and retrieve contracts' interactions.
 *
 * Optionally - it is possible to pass:
 * 1. {@link ConfirmationStatus.confirmed} flag - to receive only confirmed interactions - ie. interactions with
 * enough confirmations, whose existence is confirmed by at least 3 Arweave peers.
 * 2. {@link ConfirmationStatus.notCorrupted} flag - to receive both already confirmed and not yet confirmed (ie. latest)
 * interactions.
 * 3. {@link SourceType} - to receive interactions based on their origin ({@link SourceType.ARWEAVE} or {@link SourceType.WARP_SEQUENCER}).
 * If not set, by default {@link SourceType.BOTH} is set.
 *
 * Passing no flag is the "backwards compatible" mode (ie. it will behave like the original Arweave GQL gateway endpoint).
 * Note that this may result in returning corrupted and/or forked interactions
 * - read more {@link https://github.com/warp-contracts/redstone-sw-gateway#corrupted-transactions}.
 */
export declare class WarpGatewayInteractionsLoader implements InteractionsLoader {
    private readonly confirmationStatus;
    private readonly source;
    private _warp;
    constructor(confirmationStatus?: ConfirmationStatus, source?: SourceType);
    private readonly logger;
    load(contractId: string, fromSortKey?: string, toSortKey?: string, evaluationOptions?: EvaluationOptions): Promise<GQLNodeInterface[]>;
    type(): GW_TYPE;
    clearCache(): void;
    set warp(warp: Warp);
}
//# sourceMappingURL=WarpGatewayInteractionsLoader.d.ts.map