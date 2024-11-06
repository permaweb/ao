import * as WasmClient from '../../wasm.js'
import * as AoEvaluationClient from '../../ao-evaluation.js'
import * as SqliteClient from '../../sqlite.js'

import { evaluateWith } from '../evaluate.js'

export const createApis = async (ctx) => {
  const sqlite = await SqliteClient.createSqliteClient({ url: ctx.DB_URL, bootstrap: false })
  const wasmInstanceCache = WasmClient.createWasmInstanceCache({ MAX_SIZE: ctx.WASM_INSTANCE_CACHE_MAX_SIZE })

  const close = async (streamId) => wasmInstanceCache.delete(streamId)

  const evaluate = evaluateWith({
    wasmInstanceCache,
    addExtension: WasmClient.addExtensionWith({
      ARWEAVE_URL: ctx.ARWEAVE_URL,
      GRAPHQL_URL: ctx.GRAPHQL_URL,
      CHECKPOINT_GRAPHQL_URL: ctx.CHECKPOINT_GRAPHQL_URL
    }),
    bootstrapWasmInstance: WasmClient.bootstrapWasmInstanceWith(),
    saveEvaluation: AoEvaluationClient.saveEvaluationWith({ db: sqlite, logger: ctx.logger }),
    ARWEAVE_URL: ctx.ARWEAVE_URL,
    logger: ctx.logger
  })

  return { evaluate, close }
}
