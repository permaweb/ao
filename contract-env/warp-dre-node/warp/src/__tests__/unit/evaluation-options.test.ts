import { EvaluationOptionsEvaluator } from '../../contract/EvaluationOptionsEvaluator';
import { WarpFactory } from '../../core/WarpFactory';
import { SourceType } from '../../core/modules/impl/WarpGatewayInteractionsLoader';

describe('Evaluation options evaluator', () => {
  const warp = WarpFactory.forLocal();

  it('should properly set root evaluation options', async () => {
    const contract = warp.contract(null);

    expect(new EvaluationOptionsEvaluator(contract.evaluationOptions(), {}).rootOptions).toEqual({
      allowBigInt: false,
      cacheEveryNInteractions: -1,
      gasLimit: 9007199254740991,
      ignoreExceptions: true,
      internalWrites: false,
      maxCallDepth: 7,
      maxInteractionEvaluationTimeSeconds: 60,
      mineArLocalBlocks: true,
      remoteStateSyncEnabled: false,
      remoteStateSyncSource: 'https://dre-1.warp.cc/contract',
      sequencerUrl: 'https://d1o5nlqr4okus2.cloudfront.net/',
      sourceType: SourceType.BOTH,
      stackTrace: {
        saveState: false
      },
      throwOnInternalWriteError: true,
      unsafeClient: 'throw',
      updateCacheForEachInteraction: false,
      useKVStorage: false,
      waitForConfirmation: false,
      useConstructor: false,
      walletBalanceUrl: 'http://nyc-1.dev.arweave.net:1984/'
    });

    contract.setEvaluationOptions({
      allowBigInt: true,
      internalWrites: true,
      gasLimit: 3453453
    });

    expect(
      new EvaluationOptionsEvaluator(contract.evaluationOptions(), {
        allowBigInt: true,
        internalWrites: true,
        gasLimit: 3453453
      }).rootOptions
    ).toEqual({
      allowBigInt: true,
      cacheEveryNInteractions: -1,
      gasLimit: 3453453,
      ignoreExceptions: true,
      internalWrites: true,
      maxCallDepth: 7,
      maxInteractionEvaluationTimeSeconds: 60,
      mineArLocalBlocks: true,
      remoteStateSyncEnabled: false,
      remoteStateSyncSource: 'https://dre-1.warp.cc/contract',
      sequencerUrl: 'https://d1o5nlqr4okus2.cloudfront.net/',
      sourceType: SourceType.BOTH,
      stackTrace: {
        saveState: false
      },
      throwOnInternalWriteError: true,
      unsafeClient: 'throw',
      updateCacheForEachInteraction: false,
      useKVStorage: false,
      waitForConfirmation: false,
      useConstructor: false,
      walletBalanceUrl: 'http://nyc-1.dev.arweave.net:1984/'
    });

    const contract2 = warp.contract(null).setEvaluationOptions({
      internalWrites: true,
      unsafeClient: 'allow',
      gasLimit: 2222,
      maxCallDepth: 5
    });

    expect(new EvaluationOptionsEvaluator(contract2.evaluationOptions(), {}).rootOptions).toEqual({
      allowBigInt: false,
      cacheEveryNInteractions: -1,
      gasLimit: 2222,
      ignoreExceptions: true,
      internalWrites: true,
      maxCallDepth: 5,
      maxInteractionEvaluationTimeSeconds: 60,
      mineArLocalBlocks: true,
      remoteStateSyncEnabled: false,
      remoteStateSyncSource: 'https://dre-1.warp.cc/contract',
      sequencerUrl: 'https://d1o5nlqr4okus2.cloudfront.net/',
      sourceType: 'both',
      stackTrace: {
        saveState: false
      },
      throwOnInternalWriteError: true,
      unsafeClient: 'allow',
      updateCacheForEachInteraction: false,
      useKVStorage: false,
      waitForConfirmation: false,
      useConstructor: false,
      walletBalanceUrl: 'http://nyc-1.dev.arweave.net:1984/'
    });

    expect(
      new EvaluationOptionsEvaluator(contract2.evaluationOptions(), {
        internalWrites: false
      }).rootOptions
    ).toEqual({
      allowBigInt: false,
      cacheEveryNInteractions: -1,
      gasLimit: 2222,
      ignoreExceptions: true,
      internalWrites: false,
      maxCallDepth: 5,
      maxInteractionEvaluationTimeSeconds: 60,
      mineArLocalBlocks: true,
      remoteStateSyncEnabled: false,
      remoteStateSyncSource: 'https://dre-1.warp.cc/contract',
      sequencerUrl: 'https://d1o5nlqr4okus2.cloudfront.net/',
      sourceType: 'both',
      stackTrace: {
        saveState: false
      },
      throwOnInternalWriteError: true,
      unsafeClient: 'allow',
      updateCacheForEachInteraction: false,
      useKVStorage: false,
      waitForConfirmation: false,
      useConstructor: false,
      walletBalanceUrl: 'http://nyc-1.dev.arweave.net:1984/'
    });

    expect(
      new EvaluationOptionsEvaluator(contract2.evaluationOptions(), {
        unsafeClient: 'throw'
      }).rootOptions
    ).toEqual({
      allowBigInt: false,
      cacheEveryNInteractions: -1,
      gasLimit: 2222,
      ignoreExceptions: true,
      internalWrites: true,
      maxCallDepth: 5,
      maxInteractionEvaluationTimeSeconds: 60,
      mineArLocalBlocks: true,
      remoteStateSyncEnabled: false,
      remoteStateSyncSource: 'https://dre-1.warp.cc/contract',
      sequencerUrl: 'https://d1o5nlqr4okus2.cloudfront.net/',
      sourceType: 'both',
      stackTrace: {
        saveState: false
      },
      throwOnInternalWriteError: true,
      unsafeClient: 'throw',
      updateCacheForEachInteraction: false,
      useKVStorage: false,
      waitForConfirmation: false,
      useConstructor: false,
      walletBalanceUrl: 'http://nyc-1.dev.arweave.net:1984/'
    });

    expect(
      new EvaluationOptionsEvaluator(contract2.evaluationOptions(), {
        unsafeClient: 'skip'
      }).rootOptions
    ).toEqual({
      allowBigInt: false,
      cacheEveryNInteractions: -1,
      gasLimit: 2222,
      ignoreExceptions: true,
      internalWrites: true,
      maxCallDepth: 5,
      maxInteractionEvaluationTimeSeconds: 60,
      mineArLocalBlocks: true,
      remoteStateSyncEnabled: false,
      remoteStateSyncSource: 'https://dre-1.warp.cc/contract',
      sequencerUrl: 'https://d1o5nlqr4okus2.cloudfront.net/',
      sourceType: 'both',
      stackTrace: {
        saveState: false
      },
      throwOnInternalWriteError: true,
      unsafeClient: 'skip',
      updateCacheForEachInteraction: false,
      useKVStorage: false,
      waitForConfirmation: false,
      useConstructor: false,
      walletBalanceUrl: 'http://nyc-1.dev.arweave.net:1984/'
    });

    const contract3 = warp.contract(null).setEvaluationOptions({
      internalWrites: false,
      unsafeClient: 'throw',
      gasLimit: 2222,
      maxCallDepth: 5
    });

    expect(function () {
      const result = new EvaluationOptionsEvaluator(contract3.evaluationOptions(), {
        internalWrites: true
      }).rootOptions;
    }).toThrow('Cannot proceed with contract evaluation.');

    expect(function () {
      const result = new EvaluationOptionsEvaluator(contract3.evaluationOptions(), {
        unsafeClient: 'allow'
      }).rootOptions;
    }).toThrow('Cannot proceed with contract evaluation.');

    expect(function () {
      const result = new EvaluationOptionsEvaluator(contract3.evaluationOptions(), {
        unsafeClient: 'skip'
      }).rootOptions;
    }).toThrow('Cannot proceed with contract evaluation.');
  });

  it('should properly set foreign evaluation options - unsafeClient - allow', async () => {
    const contract = warp.contract(null).setEvaluationOptions({
      unsafeClient: 'allow'
    });
    const eoEvaluator = new EvaluationOptionsEvaluator(contract.evaluationOptions(), {});

    expect(eoEvaluator.forForeignContract({ unsafeClient: 'allow' })['unsafeClient']).toEqual('allow');
    expect(eoEvaluator.forForeignContract({ unsafeClient: 'skip' })['unsafeClient']).toEqual('skip');
    expect(eoEvaluator.forForeignContract({ unsafeClient: 'throw' })['unsafeClient']).toEqual('skip');
  });

  it('should properly set foreign evaluation options - unsafeClient - skip', async () => {
    const contract = warp.contract(null).setEvaluationOptions({
      unsafeClient: 'skip'
    });
    const eoEvaluator = new EvaluationOptionsEvaluator(contract.evaluationOptions(), {});

    expect(eoEvaluator.forForeignContract({ unsafeClient: 'allow' })['unsafeClient']).toEqual('skip');
    expect(eoEvaluator.forForeignContract({ unsafeClient: 'skip' })['unsafeClient']).toEqual('skip');
    expect(eoEvaluator.forForeignContract({ unsafeClient: 'throw' })['unsafeClient']).toEqual('skip');
  });

  it('should properly set foreign evaluation options - unsafeClient - throw', async () => {
    const contract = warp.contract(null).setEvaluationOptions({
      unsafeClient: 'throw'
    });
    const eoEvaluator = new EvaluationOptionsEvaluator(contract.evaluationOptions(), {});

    expect(eoEvaluator.forForeignContract({ unsafeClient: 'allow' })['unsafeClient']).toEqual('throw');
    expect(eoEvaluator.forForeignContract({ unsafeClient: 'skip' })['unsafeClient']).toEqual('throw');
    expect(eoEvaluator.forForeignContract({ unsafeClient: 'throw' })['unsafeClient']).toEqual('throw');
  });

  it('should properly set foreign evaluation options - internalWrites - true', async () => {
    const contract = warp.contract(null).setEvaluationOptions({
      internalWrites: true
    });
    const eoEvaluator = new EvaluationOptionsEvaluator(contract.evaluationOptions(), {});

    expect(eoEvaluator.forForeignContract({ internalWrites: true })['internalWrites']).toEqual(true);
    expect(eoEvaluator.forForeignContract({ internalWrites: false })['internalWrites']).toEqual(false);
  });

  it('should properly set foreign evaluation options - internalWrites - false', async () => {
    const contract = warp.contract(null).setEvaluationOptions({
      internalWrites: false
    });
    const eoEvaluator = new EvaluationOptionsEvaluator(contract.evaluationOptions(), {});

    expect(eoEvaluator.forForeignContract({ internalWrites: true })['internalWrites']).toEqual(true);
    expect(eoEvaluator.forForeignContract({ internalWrites: false })['internalWrites']).toEqual(false);
  });

  it('should properly set foreign evaluation options - throwOnInternalWriteError - true', async () => {
    const contract = warp.contract(null).setEvaluationOptions({
      throwOnInternalWriteError: true
    });
    const eoEvaluator = new EvaluationOptionsEvaluator(contract.evaluationOptions(), {});

    expect(eoEvaluator.forForeignContract({ throwOnInternalWriteError: true })['throwOnInternalWriteError']).toEqual(
      true
    );
    expect(eoEvaluator.forForeignContract({ throwOnInternalWriteError: false })['throwOnInternalWriteError']).toEqual(
      false
    );
  });

  it('should properly set foreign evaluation options - throwOnInternalWriteError - false', async () => {
    const contract = warp.contract(null).setEvaluationOptions({
      throwOnInternalWriteError: false
    });
    const eoEvaluator = new EvaluationOptionsEvaluator(contract.evaluationOptions(), {});

    expect(eoEvaluator.forForeignContract({ throwOnInternalWriteError: true })['throwOnInternalWriteError']).toEqual(
      true
    );
    expect(eoEvaluator.forForeignContract({ throwOnInternalWriteError: false })['throwOnInternalWriteError']).toEqual(
      false
    );
  });

  it('should properly set foreign evaluation options - ignoreExceptions - true', async () => {
    const contract = warp.contract(null).setEvaluationOptions({
      ignoreExceptions: true
    });
    const eoEvaluator = new EvaluationOptionsEvaluator(contract.evaluationOptions(), {});

    expect(eoEvaluator.forForeignContract({ ignoreExceptions: true })['ignoreExceptions']).toEqual(true);
    expect(eoEvaluator.forForeignContract({ ignoreExceptions: false })['ignoreExceptions']).toEqual(true);
  });

  it('should properly set foreign evaluation options - ignoreExceptions - false', async () => {
    const contract = warp.contract(null).setEvaluationOptions({
      ignoreExceptions: false
    });
    const eoEvaluator = new EvaluationOptionsEvaluator(contract.evaluationOptions(), {});

    expect(eoEvaluator.forForeignContract({ ignoreExceptions: true })['ignoreExceptions']).toEqual(false);
    expect(eoEvaluator.forForeignContract({ ignoreExceptions: false })['ignoreExceptions']).toEqual(false);
  });

  it('should properly set sourceType - from manifest BOTH', async () => {
    const contract = warp.contract(null).setEvaluationOptions({
      ignoreExceptions: false,
      sourceType: null
    });
    const eoEvaluator = new EvaluationOptionsEvaluator(contract.evaluationOptions(), { sourceType: SourceType.BOTH });

    expect(eoEvaluator.forForeignContract({ ignoreExceptions: true })['sourceType']).toEqual(SourceType.BOTH);
    expect(eoEvaluator.forForeignContract({ ignoreExceptions: false })['sourceType']).toEqual(SourceType.BOTH);
  });

  it('should properly set sourceType - from manifest ARWEAVE', async () => {
    const contract = warp.contract(null).setEvaluationOptions({
      ignoreExceptions: false,
      sourceType: SourceType.BOTH
    });
    const eoEvaluator = new EvaluationOptionsEvaluator(contract.evaluationOptions(), {
      sourceType: SourceType.ARWEAVE
    });

    expect(eoEvaluator.forForeignContract({ ignoreExceptions: true })['sourceType']).toEqual(SourceType.ARWEAVE);
    expect(eoEvaluator.forForeignContract({ ignoreExceptions: false })['sourceType']).toEqual(SourceType.ARWEAVE);
  });
});
