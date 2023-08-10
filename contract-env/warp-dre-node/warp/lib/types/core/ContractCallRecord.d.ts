import { InteractionData } from './modules/impl/HandlerExecutorFactory';
import { InnerCallType } from '../contract/Contract';
export declare class ContractCallRecord {
    readonly contractTxId: string;
    readonly depth: number;
    readonly innerCallType: InnerCallType;
    readonly interactions: {
        [key: string]: InteractionCall;
    };
    readonly id: string;
    constructor(contractTxId: string, depth: number, innerCallType?: InnerCallType);
    addInteractionData(interactionData: InteractionData<any>): InteractionCall;
    getInteraction(txId: string): InteractionCall;
    print(): string;
}
export declare class InteractionCall {
    readonly interactionInput: InteractionInput;
    interactionOutput: InteractionOutput;
    private constructor();
    static create(interactionInput: InteractionInput): InteractionCall;
    update(interactionOutput: InteractionOutput): void;
}
export declare class InteractionInput {
    readonly txId: string;
    readonly sortKey: string;
    readonly blockHeight: number;
    readonly blockTimestamp: number;
    readonly caller: string;
    readonly functionName: string;
    readonly functionArguments: [];
    readonly dryWrite: boolean;
    readonly foreignContractCalls: {
        [key: string]: ContractCallRecord;
    };
    constructor(txId: string, sortKey: string, blockHeight: number, blockTimestamp: number, caller: string, functionName: string, functionArguments: [], dryWrite: boolean, foreignContractCalls?: {
        [key: string]: ContractCallRecord;
    });
}
export declare class InteractionOutput {
    readonly cacheHit: boolean;
    readonly outputState: any;
    readonly executionTime: number;
    readonly valid: boolean;
    readonly errorMessage: string;
    readonly gasUsed: number;
    constructor(cacheHit: boolean, outputState: any, executionTime: number, valid: boolean, errorMessage: string, gasUsed: number);
}
//# sourceMappingURL=ContractCallRecord.d.ts.map