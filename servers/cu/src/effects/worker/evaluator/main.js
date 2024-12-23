import * as WasmClient from '../../wasm.js'
import * as AoEvaluationClient from '../../ao-evaluation.js'
import * as DbClient from '../../db.js'

import { evaluateWith } from '../evaluate.js'

export const createApis = async (ctx) => {
  const db = await DbClient.createDbClient({ url: ctx.DB_URL, bootstrap: false, max: 5 })
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
    saveEvaluation: AoEvaluationClient.saveEvaluationWith({
      DISABLE_PROCESS_EVALUATION_CACHE: ctx.DISABLE_PROCESS_EVALUATION_CACHE,
      db,
      logger: ctx.logger
    }),
    ARWEAVE_URL: ctx.ARWEAVE_URL,
    logger: ctx.logger
  })

  return { evaluate, close }
}
