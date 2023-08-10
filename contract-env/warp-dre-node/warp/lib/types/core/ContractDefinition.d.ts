/**
 * This type contains all data and meta-data of the given contact.
 */
/// <reference types="node" />
import { ContractType, EvaluationManifest } from '../contract/deploy/CreateContract';
export declare const SUPPORTED_SRC_CONTENT_TYPES: string[];
export declare class ContractMetadata {
    dtor: number;
}
export type ContractSource = {
    src: string | null;
    srcBinary: Buffer | null;
    srcWasmLang: string | null;
    contractType: ContractType;
    srcTx: any;
    metadata?: ContractMetadata;
};
export declare class SrcCache {
    src: string | null;
    srcBinary: Buffer | null;
    srcWasmLang: string | null;
    constructor(value: ContractDefinition<unknown>);
}
export declare class ContractCache<State> {
    txId: string;
    srcTxId: string;
    initState: State;
    minFee: string;
    owner: string;
    contractType: ContractType;
    metadata?: ContractMetadata;
    manifest?: EvaluationManifest;
    contractTx: any;
    srcTx: any;
    testnet: string | null;
    constructor(value: ContractDefinition<State>);
}
export type ContractDefinition<State> = SrcCache & ContractCache<State>;
//# sourceMappingURL=ContractDefinition.d.ts.map