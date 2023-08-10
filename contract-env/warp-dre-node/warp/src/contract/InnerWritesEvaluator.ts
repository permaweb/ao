import { ContractCallRecord, InteractionCall } from '../core/ContractCallRecord';

export class InnerWritesEvaluator {
  eval(callStack: ContractCallRecord): Array<string> {
    const result = [];
    Object.keys(callStack.interactions).forEach((k) => {
      const interaction = callStack.interactions[k];
      this.evalForeignCalls(callStack.contractTxId, interaction, result);
    });

    return result;
  }

  private evalForeignCalls(rootContractTxId: string, interaction: InteractionCall, result: Array<string>) {
    Object.keys(interaction.interactionInput.foreignContractCalls).forEach((foreignContractCallKey) => {
      const foreignContractCall = interaction.interactionInput.foreignContractCalls[foreignContractCallKey];
      if (foreignContractCall.innerCallType == 'write') {
        Object.keys(foreignContractCall.interactions).forEach((k) => {
          const foreignInteraction = foreignContractCall.interactions[k];
          if (
            foreignInteraction.interactionInput.dryWrite &&
            !result.includes(foreignContractCall.contractTxId) &&
            rootContractTxId !== foreignContractCall.contractTxId /*"write-backs"*/
          ) {
            result.push(foreignContractCall.contractTxId);
          }
          this.evalForeignCalls(rootContractTxId, foreignInteraction, result);
        });
      }
    });
  }
}
