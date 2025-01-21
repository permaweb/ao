import * as WasmClient from '../../wasm.js'
import * as AoEvaluationClient from '../../ao-evaluation.js'
import * as DbClient from '../../db.js'
import workerpool from 'workerpool'
import PQueue from 'p-queue'
import { evaluateWith } from '../evaluate.js'
import { join } from 'path'
import { randomBytes } from 'crypto'

export const createApis = async (ctx) => {
  const db = await DbClient.createDbClient({ url: ctx.DB_URL, bootstrap: false, max: 5 })
  const wasmInstanceCache = WasmClient.createWasmInstanceCache({ MAX_SIZE: ctx.WASM_INSTANCE_CACHE_MAX_SIZE })

  const close = async (streamId) => wasmInstanceCache.delete(streamId)

  const BROADCAST = 'workers'
  const __dirname = ctx.__dirname
  const hydratorWorker = join(__dirname, 'effects', 'worker', 'hydrator', 'index.js')
  const onCreateHydratorWorker = () => () => {
    const workerId = randomBytes(8).toString('hex')
    ctx.logger('Spinning up hydrator worker with id "%s"...', workerId)

    return {
      workerThreadOpts: {
        workerData: {
          BROADCAST,
          WASM_MODULE_CACHE_MAX_SIZE: ctx.WASM_MODULE_CACHE_MAX_SIZE,
          WASM_INSTANCE_CACHE_MAX_SIZE: ctx.WASM_INSTANCE_CACHE_MAX_SIZE,
          WASM_BINARY_FILE_DIRECTORY: ctx.WASM_BINARY_FILE_DIRECTORY,
          ARWEAVE_URL: ctx.ARWEAVE_URL,
          GRAPHQL_URL: ctx.GRAPHQL_URL,
          CHECKPOINT_GRAPHQL_URL: ctx.CHECKPOINT_GRAPHQL_URL,
          DB_URL: ctx.DB_URL,
          id: workerId,
          MODE: ctx.MODE,
          LOG_CONFIG_PATH: ctx.LOG_CONFIG_PATH,
          DEFAULT_LOG_LEVEL: ctx.DEFAULT_LOG_LEVEL,
          DISABLE_PROCESS_EVALUATION_CACHE: ctx.DISABLE_PROCESS_EVALUATION_CACHE,
          EVALUATION_RESULT_DIR: ctx.EVALUATION_RESULT_DIR,
          EVALUATION_RESULT_BUCKET: ctx.EVALUATION_RESULT_BUCKET
        }
      }
    }
  }
  const hydratorWorkerPool = workerpool.pool(hydratorWorker, {
    maxWorkers: 2, // TODO: change?
    onCreateWorker: onCreateHydratorWorker(),
    onTerminateWorker: (ctx) => {
      console.log('444 Worker terminated', ctx)
    }
  })
  const hydratorWorkQueue = new PQueue({ concurrency: 2 })

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
      logger: ctx.logger,
      saveEvaluationToDir: (args) => {
        return hydratorWorkQueue.add(() =>
          Promise.resolve()
            .then(async () => await hydratorWorkerPool.exec('saveEvaluationToDir', [args]))
            .then((result) => {
              console.log('444 Result', { result })
              return result
            })
            .catch((e) => {
              console.error('Error in hydrator worker', e)
              throw e
            })
        )
      },
      EVALUATION_RESULT_DIR: ctx.EVALUATION_RESULT_DIR,
      EVALUATION_RESULT_BUCKET: ctx.EVALUATION_RESULT_BUCKET
    }),
    ARWEAVE_URL: ctx.ARWEAVE_URL,
    logger: ctx.logger
  })

  return { evaluate, close }
}
