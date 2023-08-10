import { WriteInteractionOptions, WriteInteractionResponse } from './Contract';
import { PstState, PstContract, BalanceResult, TransferInput } from './PstContract';
import { HandlerBasedContract } from './HandlerBasedContract';
export declare class PstContractImpl extends HandlerBasedContract<PstState> implements PstContract {
    currentBalance(target: string): Promise<BalanceResult>;
    currentState(): Promise<PstState>;
    transfer(transfer: TransferInput, options?: WriteInteractionOptions): Promise<WriteInteractionResponse | null>;
}
//# sourceMappingURL=PstContractImpl.d.ts.map