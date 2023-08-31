import Arweave from 'arweave';
import { rustWasmImports, WarpContractsCrateVersion } from './wasm/rust-wasm-imports';
import { ContractDefinition } from '../../ContractDefinition';
import { ExecutionContext } from '../../ExecutionContext';
import { GQLNodeInterface } from '../../../legacy/gqlResult';
import { SmartWeaveGlobal } from '../../../legacy/smartweave-global';
import { Benchmark } from '../../../logging/Benchmark';
import { LoggerFactory } from '../../../logging/LoggerFactory';
import { ExecutorFactory } from '../ExecutorFactory';
import { EvalStateResult, EvaluationOptions } from '../StateEvaluator';
import { JsHandlerApi } from './handler/JsHandlerApi';
import { WasmHandlerApi } from './handler/WasmHandlerApi';
import { normalizeContractSource } from './normalize-source';
import { Warp } from '../../Warp';
import { isBrowser } from '../../../utils/utils';
import { Buffer } from 'warp-isomorphic';
import { InteractionState } from '../../../contract/states/InteractionState';
import { WarpLogger } from '../../../logging/WarpLogger';

// 'require' to fix esbuild adding same lib in both cjs and esm format
// https://github.com/evanw/esbuild/issues/1950
// eslint-disable-next-line
const BigNumber = require('bignumber.js');

export class ContractError<T> extends Error {
  constructor(readonly error: T, readonly subtype?: string) {
    super(error.toString());
    this.name = 'ContractError';
  }
}

/**
 * A factory that produces handlers that are compatible with the "current" style of
 * writing SW contracts (i.e. using "handle" function).
 */
export class HandlerExecutorFactory implements ExecutorFactory<HandlerApi<unknown>> {
  private readonly logger = LoggerFactory.INST.create('HandlerExecutorFactory');

  constructor(private readonly arweave: Arweave) {}

  async create<State>(
    contractDefinition: ContractDefinition<State>,
    evaluationOptions: EvaluationOptions,
    warp: Warp,
    interactionState: InteractionState
  ): Promise<HandlerApi<State>> {
    if (warp.hasPlugin('contract-blacklist')) {
      const blacklistPlugin = warp.loadPlugin<string, Promise<boolean>>('contract-blacklist');
      let blacklisted = false;
      try {
        blacklisted = await blacklistPlugin.process(contractDefinition.txId);
      } catch (e) {
        this.logger.error(e);
      }
      if (blacklisted == true) {
        throw new ContractError(
          `[SkipUnsafeError] Skipping evaluation of the blacklisted contract ${contractDefinition.txId}.`,
          `blacklistedSkip`
        );
      }
    }
    let kvStorage = null;

    if (evaluationOptions.useKVStorage) {
      kvStorage = warp.kvStorageFactory(contractDefinition.txId);
    }

    const swGlobal = new SmartWeaveGlobal(
      this.arweave,
      {
        id: contractDefinition.txId,
        owner: contractDefinition.owner
      },
      evaluationOptions,
      interactionState,
      kvStorage
    );

    const extensionPlugins = warp.matchPlugins(`^smartweave-extension-`);
    extensionPlugins.forEach((ex) => {
      const extension = warp.loadPlugin<unknown, void>(ex);
      extension.process(swGlobal.extensions);
    });

    // if (contractDefinition.contractType == 'hyperbeam') {
    //   // deploy contract contentType application/wasm contractType hyperbeam
    //   // appVersion 0.4.0, appName 
    //   // import loader 
    //   // create smartweave global object readonly (txid, blockid)
    //   // https://academy.warp.cc/docs/sdk/basic/smartweave-global
    //   // readonly no functions
    //   // get current state and action
    //   // get hyperbeam wasm, instantiate loader
    //   // https://www.npmjs.com/package/@permaweb/hyperbeam-loader
    //   // run handle


    // } else 
    if (contractDefinition.contractType == 'wasm') {
      this.logger.info('Creating handler for wasm contract', contractDefinition.txId);
      const benchmark = Benchmark.measure();

      let wasmInstance: WebAssembly.Instance;
      let jsExports = null;

      const wasmResponse = generateResponse(contractDefinition.srcBinary);

      switch (contractDefinition.srcWasmLang) {
        case 'rust': {
          const wasmInstanceExports = {
            exports: null,
            modifiedExports: {
              wasm_bindgen__convert__closures__invoke2_mut__: null,
              _dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__:
                null
            }
          };

          /**
           * wasm-bindgen mangles import function names (adds some random number after "base name")
           * - that's why we cannot statically build the imports in the SDK.
           * Instead - we need to first compile the module and check the generated
           * import function names (all imports from the "__wbindgen_placeholder__" import module).
           * Having those generated function names - we need to then map them to import functions -
           * see {@link rustWasmImports}
           *
           * That's probably a temporary solution - it would be the best to force the wasm-bindgen
           * to NOT mangle the import function names - unfortunately that is not currently possible
           * - https://github.com/rustwasm/wasm-bindgen/issues/1128
           */
          const wasmModule = await getWasmModule(wasmResponse, contractDefinition.srcBinary);
          const warpContractsCrateVersion =
            WebAssembly.Module.exports(wasmModule)
              .filter((exp) => exp.kind === 'global' && exp.name.startsWith('__WARP_CONTRACTS_VERSION_'))
              .map((exp) => exp.name)
              .shift() || '__WARP_CONTRACTS_VERSION_LEGACY';

          const wbindgenImports = WebAssembly.Module.imports(wasmModule)
            .filter((imp) => {
              return imp.module === '__wbindgen_placeholder__';
            })
            .map((imp) => imp.name);

          const { imports, exports } = rustWasmImports(
            swGlobal,
            wbindgenImports,
            wasmInstanceExports,
            contractDefinition.metadata.dtor,
            warpContractsCrateVersion as WarpContractsCrateVersion
          );
          jsExports = exports;

          wasmInstance = await WebAssembly.instantiate(wasmModule, imports);
          wasmInstanceExports.exports = wasmInstance.exports;

          const moduleExports = Object.keys(wasmInstance.exports);

          // ... no comments ...
          moduleExports.forEach((moduleExport) => {
            if (moduleExport.startsWith('wasm_bindgen__convert__closures__invoke2_mut__')) {
              wasmInstanceExports.modifiedExports.wasm_bindgen__convert__closures__invoke2_mut__ =
                wasmInstance.exports[moduleExport];
            }
            if (
              moduleExport.startsWith(
                '_dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__'
              )
            ) {
              wasmInstanceExports.modifiedExports._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__ =
                wasmInstance.exports[moduleExport];
            }
          });
          break;
        }

        default: {
          throw new Error(`Support for ${contractDefinition.srcWasmLang} not implemented yet.`);
        }
      }
      this.logger.info(`WASM ${contractDefinition.srcWasmLang} handler created in ${benchmark.elapsed()}`);
      return new WasmHandlerApi(swGlobal, contractDefinition, jsExports || wasmInstance.exports);
    } else {
      const normalizedSource = normalizeContractSource(contractDefinition.src, warp.hasPlugin('vm2'));
      if (normalizedSource.includes('unsafeClient')) {
        switch (evaluationOptions.unsafeClient) {
          case 'allow': {
            this.logger.warn(`Reading unsafe contract ${contractDefinition.txId}, evaluation is non-deterministic!`);
            break;
          }
          case 'throw':
            throw new Error(
              `[SkipUnsafeError] Using unsafeClient is not allowed by default. Use EvaluationOptions.unsafeClient flag to evaluate ${contractDefinition.txId}.`
            );
          case 'skip': {
            throw new ContractError(
              `[SkipUnsafeError] Skipping evaluation of the unsafe contract ${contractDefinition.txId}.`,
              'unsafeClientSkip'
            );
          }
          default:
            throw new Error(`Unknown unsafeClient setting ${evaluationOptions.unsafeClient}`);
        }
      }
      if (!evaluationOptions.allowBigInt) {
        if (normalizedSource.includes('BigInt')) {
          throw new Error('Using BigInt is not allowed by default. Use EvaluationOptions.allowBigInt flag.');
        }
      }
      if (warp.hasPlugin('vm2')) {
        const vm2Plugin = warp.loadPlugin<VM2PluginInput, HandlerApi<State>>('vm2');
        return vm2Plugin.process({ normalizedSource, swGlobal, logger: this.logger, contractDefinition });
      } else if (warp.hasPlugin('ivm-handler-api')) {
        const ivmPlugin = warp.loadPlugin<IvmPluginInput, HandlerApi<State>>('ivm-handler-api');
        return ivmPlugin.process({
          contractSource: contractDefinition.src,
          evaluationOptions,
          arweave: this.arweave,
          swGlobal: swGlobal,
          contractDefinition
        });
      } else {
        const contractFunction = new Function(normalizedSource);
        const handler = isBrowser()
          ? contractFunction(swGlobal, BigNumber, LoggerFactory.INST.create(swGlobal.contract.id), Buffer, atob, btoa)
          : contractFunction(swGlobal, BigNumber, LoggerFactory.INST.create(swGlobal.contract.id));
        return new JsHandlerApi(swGlobal, contractDefinition, handler);
      }
    }
  }
}

function generateResponse(wasmBinary: Buffer): Response {
  const init = { status: 200, statusText: 'OK', headers: { 'Content-Type': 'application/wasm' } };
  return new Response(wasmBinary, init);
}

async function getWasmModule(wasmResponse: Response, binary: Buffer): Promise<WebAssembly.Module> {
  if (WebAssembly.compileStreaming) {
    return await WebAssembly.compileStreaming(wasmResponse);
  } else {
    return await WebAssembly.compile(binary);
  }
}

export interface InteractionData<Input> {
  interaction: ContractInteraction<Input>;
  interactionTx: GQLNodeInterface;
}

/**
 * A handle that effectively runs contract's code.
 */
export interface HandlerApi<State> {
  handle<Input, Result>(
    executionContext: ExecutionContext<State>,
    currentResult: EvalStateResult<State>,
    interactionData: InteractionData<Input>
  ): Promise<InteractionResult<State, Result>>;

  initState(state: State): void;

  maybeCallStateConstructor(initialState: State, executionContext: ExecutionContext<State>): Promise<State>;
}

export type HandlerFunction<State, Input, Result> = (
  state: State,
  interaction: ContractInteraction<Input>
) => Promise<HandlerResult<State, Result>>;

// TODO: change to XOR between result and state?
export type HandlerResult<State, Result> = {
  result: Result;
  state: State;
  gasUsed?: number;
};

export type InteractionResult<State, Result> = HandlerResult<State, Result> & {
  type: InteractionResultType;
  errorMessage?: string;
  error?: unknown;
  originalValidity?: Record<string, boolean>;
  originalErrorMessages?: Record<string, string>;
};

export type InteractionType = 'view' | 'write';

export type ContractInteraction<Input> = {
  input: Input;
  caller: string;
  interactionType: InteractionType;
};

export type InteractionResultType = 'ok' | 'error' | 'exception';

export interface IvmOptions {
  // Options for isolated-vm:
  // memory limit - defaults to 100MB
  // timeout (script time evaluation limit) - defaults to 60s
  memoryLimit?: number;
  timeout?: number;
}

export interface IvmPluginInput {
  contractSource: string;
  evaluationOptions: EvaluationOptions;
  arweave: Arweave;
  swGlobal: SmartWeaveGlobal;
  contractDefinition: ContractDefinition<unknown>;
}

export interface VM2PluginInput {
  normalizedSource: string;
  swGlobal: SmartWeaveGlobal;
  logger: WarpLogger;
  contractDefinition: ContractDefinition<unknown>;
}
