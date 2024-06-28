import * as WasmClient from '../../client/wasm.js'
import * as AoEvaluationClient from '../../client/ao-evaluation.js'
import * as SqliteClient from '../../client/sqlite.js'

import { evaluateWith } from '../evaluate.js'

export const createApis = async (ctx) => {
  const sqlite = await SqliteClient.createSqliteClient({ url: ctx.DB_URL, bootstrap: false })

  const evaluate = evaluateWith({
    /**
     * TODO: no longer needed since the wasmModule
     * is passed in. Eventually remove
     */
    loadWasmModule: WasmClient.loadWasmModuleWith({
      fetch,
      ARWEAVE_URL: ctx.ARWEAVE_URL,
      WASM_BINARY_FILE_DIRECTORY: ctx.WASM_BINARY_FILE_DIRECTORY,
      logger: ctx.logger,
      cache: WasmClient.createWasmModuleCache({ MAX_SIZE: ctx.WASM_MODULE_CACHE_MAX_SIZE })
    }),
    wasmInstanceCache: WasmClient.createWasmInstanceCache({ MAX_SIZE: ctx.WASM_INSTANCE_CACHE_MAX_SIZE }),
    addExtension: WasmClient.addExtensionWith({ ARWEAVE_URL: ctx.ARWEAVE_URL }),
    bootstrapWasmInstance: WasmClient.bootstrapWasmInstanceWith(),
    saveEvaluation: AoEvaluationClient.saveEvaluationWith({ db: sqlite, logger: ctx.logger }),
    ARWEAVE_URL: ctx.ARWEAVE_URL,
    logger: ctx.logger
  })

  return { evaluate }
}
