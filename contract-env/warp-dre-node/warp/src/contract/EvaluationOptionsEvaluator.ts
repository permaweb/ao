import { EvaluationOptions } from '../core/modules/StateEvaluator';
import { deepCopy } from '../utils/utils';

type SaferEvaluationOptions = {
  [Property in keyof EvaluationOptions]: (foreignOptions: Partial<EvaluationOptions>) => EvaluationOptions[Property];
};

export class EvaluationOptionsEvaluator {
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
  public readonly rootOptions: EvaluationOptions;

  private readonly saferEvaluationOptions: SaferEvaluationOptions = {
    // CRITICAL!
    internalWrites: (foreignOptions) => {
      if (
        foreignOptions['internalWrites'] === undefined ||
        this.rootOptions['internalWrites'] == foreignOptions['internalWrites']
      ) {
        return this.rootOptions['internalWrites'];
      }

      if (this.rootOptions['internalWrites'] && !foreignOptions['internalWrites']) {
        return foreignOptions['internalWrites'];
      }
      if (!this.rootOptions['internalWrites'] && foreignOptions['internalWrites']) {
        return foreignOptions['internalWrites'];
      }

      throw new Error('Could not determine "internalWrites" value ');
    },
    throwOnInternalWriteError: (foreignOptions) => {
      if (foreignOptions['throwOnInternalWriteError'] === undefined) {
        return this.rootOptions['throwOnInternalWriteError'];
      }
      // or should the root take precedence if foreignOptions["throwOnInternalWriteError"] = false
      // and root["throwOnInternalWriteError"] = true
      return foreignOptions['throwOnInternalWriteError'];
    },
    // CRITICAL!
    unsafeClient: (foreignOptions) => {
      // options from less secure to most secure
      // allow, skip, throw
      if (
        foreignOptions['unsafeClient'] === undefined ||
        this.rootOptions['unsafeClient'] == foreignOptions['unsafeClient']
      ) {
        return this.rootOptions['unsafeClient'];
      }

      if (this.rootOptions['unsafeClient'] === 'throw' || this.rootOptions['unsafeClient'] === 'skip') {
        return this.rootOptions['unsafeClient'];
      }

      if (this.rootOptions['unsafeClient'] === 'allow') {
        if (foreignOptions['unsafeClient'] === 'throw') {
          return 'skip'; // we don't the foreing contract to stop the evaluation of the root contract
        } else {
          return foreignOptions['unsafeClient'];
        }
      }

      throw new Error('Could not determine "unsafeClient" value');
    },
    ignoreExceptions: (foreignOptions) => {
      if (
        foreignOptions['ignoreExceptions'] === undefined ||
        this.rootOptions['ignoreExceptions'] == foreignOptions['ignoreExceptions']
      ) {
        return this.rootOptions['ignoreExceptions'];
      }
      // true in root vs false in foreign = root wins - not sure in this case.
      // if we decide to set a value from foreign contract in this case
      // - it could break the execution of the original contract
      if (this.rootOptions['ignoreExceptions'] && !foreignOptions['ignoreExceptions']) {
        return this.rootOptions['ignoreExceptions'];
      }
      // false in root vs true in foreign = root wins
      if (!this.rootOptions['ignoreExceptions'] && foreignOptions['ignoreExceptions']) {
        return this.rootOptions['ignoreExceptions'];
      }

      throw new Error('Could not determine "ignoreExceptions" value');
    },

    waitForConfirmation: () => this.rootOptions['waitForConfirmation'],
    updateCacheForEachInteraction: () => this.rootOptions['updateCacheForEachInteraction'],
    maxCallDepth: () => this.rootOptions['maxCallDepth'],
    maxInteractionEvaluationTimeSeconds: () => this.rootOptions['maxInteractionEvaluationTimeSeconds'],
    stackTrace: () => this.rootOptions['stackTrace'],
    sourceType: () => this.rootOptions['sourceType'],
    sequencerUrl: () => this.rootOptions['sequencerUrl'],
    gasLimit: () => this.rootOptions['gasLimit'],
    allowBigInt: () => this.rootOptions['allowBigInt'], // not sure about this
    walletBalanceUrl: () => this.rootOptions['walletBalanceUrl'],
    mineArLocalBlocks: () => this.rootOptions['mineArLocalBlocks'],
    cacheEveryNInteractions: () => this.rootOptions['cacheEveryNInteractions'],
    remoteStateSyncEnabled: () => this.rootOptions['remoteStateSyncEnabled'],
    remoteStateSyncSource: () => this.rootOptions['remoteStateSyncSource'],
    useKVStorage: (foreignOptions) => foreignOptions['useKVStorage'],
    useConstructor: (foreignOptions) => foreignOptions['useConstructor']
  };

  private readonly notConflictingEvaluationOptions: (keyof EvaluationOptions)[] = [
    'useKVStorage',
    'sourceType',
    'useConstructor'
  ];

  /**
   * @param userSetOptions evaluation options set via {@link Contract.setEvaluationOptions}
   * @param manifestOptions evaluation options from the root contract's manifest (i.e. the contract that
   * the user is trying to read - e.g. via warp.contract(<txId>).readState();
   */
  constructor(userSetOptions: EvaluationOptions, manifestOptions: Partial<EvaluationOptions>) {
    if (manifestOptions) {
      const errors = [];
      for (const k in manifestOptions) {
        const optionKey = k as keyof EvaluationOptions;
        const manifestValue = manifestOptions[k];
        const userValue = userSetOptions[k];
        if (this.notConflictingEvaluationOptions.includes(optionKey)) {
          continue;
        }
        // https://github.com/warp-contracts/warp/issues/425#issuecomment-1591212639
        if (optionKey === 'internalWrites') {
          if (userValue === false && manifestValue === true) {
            throw new Error(
              'Cannot proceed with contract evaluation. User is blocking internal writes, while contract requires them.'
            );
          }
        } else if (optionKey === 'unsafeClient') {
          // 'allow' | 'skip' | 'throw'
          if (
            (userValue === 'throw' && manifestValue !== 'throw') ||
            (userValue === 'skip' && manifestValue === 'allow')
          ) {
            throw new Error(
              `Cannot proceed with contract evaluation. User requires to ${userValue} on any unsafeClient usage, while contract uses ${manifestValue} option.`
            );
          }
        } else {
          if (userSetOptions[k] !== manifestOptions[k]) {
            errors.push(
              `Option {${k}} differs. EvaluationOptions: [${userSetOptions[k]}], manifest: [${manifestOptions[k]}]. Use contract.setEvaluationOptions({${k}: ${manifestOptions[k]}}) to evaluate contract state.`
            );
          }
        }
      }
      if (errors.length) {
        throw new Error(errors.join('\n'));
      }
    }

    this.rootOptions = Object.freeze(Object.assign({}, userSetOptions, manifestOptions || {}));
  }

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
  forForeignContract(foreignContractOptions?: Partial<EvaluationOptions>): EvaluationOptions {
    const options = deepCopy(this.rootOptions); //or default evaluation options?

    if (foreignContractOptions) {
      for (const k in foreignContractOptions) {
        options[k] = this.saferEvaluationOptions[k](foreignContractOptions);
      }
    }

    return Object.freeze(options);
  }
}
