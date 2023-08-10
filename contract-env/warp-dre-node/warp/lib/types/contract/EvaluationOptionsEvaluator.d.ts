import { EvaluationOptions } from '../core/modules/StateEvaluator';
export declare class EvaluationOptionsEvaluator {
    /**
     * The effective evaluation options for the root contract
     * i.e. options set via {@link Contract.setEvaluationOptions}
     * with values overwritten from contract's manifest
     * (if contract manifest was set during contract deployment).
     *
     * In other words - if certain evaluation options are available in
     * contract's manifest - they take precedence over those set via
     * {@link Contract.setEvaluationOptions}
     */
    readonly rootOptions: EvaluationOptions;
    private readonly saferEvaluationOptions;
    private readonly notConflictingEvaluationOptions;
    /**
     * @param userSetOptions evaluation options set via {@link Contract.setEvaluationOptions}
     * @param manifestOptions evaluation options from the root contract's manifest (i.e. the contract that
     * the user is trying to read - e.g. via warp.contract(<txId>).readState();
     */
    constructor(userSetOptions: EvaluationOptions, manifestOptions: Partial<EvaluationOptions>);
    /**
     * The idea here is that evaluation of the foreign contract should not be processed with "less secure"
     * evaluation options than those set for the main/root contract (i.e. the one that is being read by the User).
     *
     * Currently, one exception to this rule are the internal writes.
     * Consider the examples below:
     *
     * Example 1:
     * 1. The root contract blocks internal writes
     * 2. The foreign contract allows for internal writes
     * => the internal writes should be allowed during evaluation of the foreign contract
     *
     * Example 2:
     * 1. The root contract has the 'unsafeClient' set to 'skip'
     * 2. The foreign contract has the 'unsafeClient' to 'allow'
     * => the 'unsafeClient' should be set to 'skip' for foreign contract
     *
     * Example 3:
     * 1. The root contract has the 'vm2' set to 'true'
     * 2. The foreign contract has the 'vm2' set to 'false'
     * => the 'vm2' for the foreign contract should be set to 'true'
     *
     * Example 4:
     * 1. The root contract has the 'maxCallDepth' set to 3
     * 2. The foreign contract has the 'maxCallDepth' set to 5
     * => the 'maxCallDepth' for the foreign contract should be set to '3'
     * NOTE: call depth is always verified from the perspective of the root contract!
     *
     * Example 5:
     * 1. The root contract has the 'maxInteractionEvaluationTimeSeconds' set to 10
     * 2. The foreign contract has the 'maxInteractionEvaluationTimeSeconds' set to 60
     * => the 'maxInteractionEvaluationTimeSeconds' for the foreign contract should be set to '10'
     *
     * On the other hand - if the root contract has less secure options than the foreign contract -
     * the more secure options of the foreign contract should be respected.
     * Example:
     * 1. Contract "A" with 'unsafeClient' = 'allow' (and unsafeClient used in its source) is performing
     * write operation on Contract "B" that has 'unsafeClient' set to 'skip'.
     * i.e. Contract A calls SmartWeave.contracts.write on Contract B.
     *
     * In this case the more secure setting of the Contract B should be reflected - and write itself
     * should be blocked (i.e. it should not be even created during the `A.writeInteraction` - when a dry-run
     * is being performed, and we're evaluating a list of internal writes for a newly created interaction).
     *
     * @param foreignContractManifest the manifest of the foreign contract that we want read/write to
     */
    forForeignContract(foreignContractOptions?: Partial<EvaluationOptions>): EvaluationOptions;
}
//# sourceMappingURL=EvaluationOptionsEvaluator.d.ts.map