import { connect } from '@permaweb/ao-scheduler-utils'

import * as WasmClient from '../../wasm.js'
import * as AoEvaluationClient from '../../ao-evaluation.js'
import * as DbClient from '../../db.js'

import { evaluateWith } from '../evaluate.js'

export const createApis = async (ctx) => {
  const db = await DbClient.createDbClient({ url: ctx.DB_URL, bootstrap: false, max: 5 })
  const wasmInstanceCache = WasmClient.createWasmInstanceCache({ MAX_SIZE: ctx.WASM_INSTANCE_CACHE_MAX_SIZE })
  const { locate } = connect({
    cacheSize: 100,
    GRAPHQL_URL: ctx.GRAPHQL_URL,
    followRedirects: true,
    GRAPHQL_MAX_RETRIES: 5,
    GRAPHQL_RETRY_BACKOFF: 300
  })

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
    locateScheduler: locate,
    logger: ctx.logger,
    ENABLE_MEMORY_RESET: ctx.ENABLE_MEMORY_RESET
  })

  return { evaluate, close }
}
