"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HandlerExecutorFactory = exports.ContractError = void 0;
const rust_wasm_imports_1 = require("./wasm/rust-wasm-imports");
const smartweave_global_1 = require("../../../legacy/smartweave-global");
const Benchmark_1 = require("../../../logging/Benchmark");
const LoggerFactory_1 = require("../../../logging/LoggerFactory");
const JsHandlerApi_1 = require("./handler/JsHandlerApi");
const WasmHandlerApi_1 = require("./handler/WasmHandlerApi");
const normalize_source_1 = require("./normalize-source");
const utils_1 = require("../../../utils/utils");
const warp_isomorphic_1 = require("warp-isomorphic");
// 'require' to fix esbuild adding same lib in both cjs and esm format
// https://github.com/evanw/esbuild/issues/1950
// eslint-disable-next-line
const BigNumber = require('bignumber.js');
class ContractError extends Error {
    constructor(error, subtype) {
        super(error.toString());
        this.error = error;
        this.subtype = subtype;
        this.name = 'ContractError';
    }
}
exports.ContractError = ContractError;
/**
 * A factory that produces handlers that are compatible with the "current" style of
 * writing SW contracts (i.e. using "handle" function).
 */
class HandlerExecutorFactory {
    constructor(arweave) {
        this.arweave = arweave;
        this.logger = LoggerFactory_1.LoggerFactory.INST.create('HandlerExecutorFactory');
    }
    async create(contractDefinition, evaluationOptions, warp, interactionState) {
        if (warp.hasPlugin('contract-blacklist')) {
            const blacklistPlugin = warp.loadPlugin('contract-blacklist');
            let blacklisted = false;
            try {
                blacklisted = await blacklistPlugin.process(contractDefinition.txId);
            }
            catch (e) {
                this.logger.error(e);
            }
            if (blacklisted == true) {
                throw new ContractError(`[SkipUnsafeError] Skipping evaluation of the blacklisted contract ${contractDefinition.txId}.`, `blacklistedSkip`);
            }
        }
        let kvStorage = null;
        if (evaluationOptions.useKVStorage) {
            kvStorage = warp.kvStorageFactory(contractDefinition.txId);
        }
        const swGlobal = new smartweave_global_1.SmartWeaveGlobal(this.arweave, {
            id: contractDefinition.txId,
            owner: contractDefinition.owner
        }, evaluationOptions, interactionState, kvStorage);
        const extensionPlugins = warp.matchPlugins(`^smartweave-extension-`);
        extensionPlugins.forEach((ex) => {
            const extension = warp.loadPlugin(ex);
            extension.process(swGlobal.extensions);
        });
        if (contractDefinition.contractType == 'wasm') {
            this.logger.info('Creating handler for wasm contract', contractDefinition.txId);
            const benchmark = Benchmark_1.Benchmark.measure();
            let wasmInstance;
            let jsExports = null;
            const wasmResponse = generateResponse(contractDefinition.srcBinary);
            switch (contractDefinition.srcWasmLang) {
                case 'rust': {
                    const wasmInstanceExports = {
                        exports: null,
                        modifiedExports: {
                            wasm_bindgen__convert__closures__invoke2_mut__: null,
                            _dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__: null
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
                    const warpContractsCrateVersion = WebAssembly.Module.exports(wasmModule)
                        .filter((exp) => exp.kind === 'global' && exp.name.startsWith('__WARP_CONTRACTS_VERSION_'))
                        .map((exp) => exp.name)
                        .shift() || '__WARP_CONTRACTS_VERSION_LEGACY';
                    const wbindgenImports = WebAssembly.Module.imports(wasmModule)
                        .filter((imp) => {
                        return imp.module === '__wbindgen_placeholder__';
                    })
                        .map((imp) => imp.name);
                    const { imports, exports } = (0, rust_wasm_imports_1.rustWasmImports)(swGlobal, wbindgenImports, wasmInstanceExports, contractDefinition.metadata.dtor, warpContractsCrateVersion);
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
                        if (moduleExport.startsWith('_dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__')) {
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
            return new WasmHandlerApi_1.WasmHandlerApi(swGlobal, contractDefinition, jsExports || wasmInstance.exports);
        }
        else {
            const normalizedSource = (0, normalize_source_1.normalizeContractSource)(contractDefinition.src, warp.hasPlugin('vm2'));
            if (normalizedSource.includes('unsafeClient')) {
                switch (evaluationOptions.unsafeClient) {
                    case 'allow': {
                        this.logger.warn(`Reading unsafe contract ${contractDefinition.txId}, evaluation is non-deterministic!`);
                        break;
                    }
                    case 'throw':
                        throw new Error(`[SkipUnsafeError] Using unsafeClient is not allowed by default. Use EvaluationOptions.unsafeClient flag to evaluate ${contractDefinition.txId}.`);
                    case 'skip': {
                        throw new ContractError(`[SkipUnsafeError] Skipping evaluation of the unsafe contract ${contractDefinition.txId}.`, 'unsafeClientSkip');
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
                const vm2Plugin = warp.loadPlugin('vm2');
                return vm2Plugin.process({ normalizedSource, swGlobal, logger: this.logger, contractDefinition });
            }
            else if (warp.hasPlugin('ivm-handler-api')) {
                const ivmPlugin = warp.loadPlugin('ivm-handler-api');
                return ivmPlugin.process({
                    contractSource: contractDefinition.src,
                    evaluationOptions,
                    arweave: this.arweave,
                    swGlobal: swGlobal,
                    contractDefinition
                });
            }
            else {
                const contractFunction = new Function(normalizedSource);
                const handler = (0, utils_1.isBrowser)()
                    ? contractFunction(swGlobal, BigNumber, LoggerFactory_1.LoggerFactory.INST.create(swGlobal.contract.id), warp_isomorphic_1.Buffer, atob, btoa)
                    : contractFunction(swGlobal, BigNumber, LoggerFactory_1.LoggerFactory.INST.create(swGlobal.contract.id));
                return new JsHandlerApi_1.JsHandlerApi(swGlobal, contractDefinition, handler);
            }
        }
    }
}
exports.HandlerExecutorFactory = HandlerExecutorFactory;
function generateResponse(wasmBinary) {
    const init = { status: 200, statusText: 'OK', headers: { 'Content-Type': 'application/wasm' } };
    return new Response(wasmBinary, init);
}
async function getWasmModule(wasmResponse, binary) {
    if (WebAssembly.compileStreaming) {
        return await WebAssembly.compileStreaming(wasmResponse);
    }
    else {
        return await WebAssembly.compile(binary);
    }
}
//# sourceMappingURL=HandlerExecutorFactory.js.map