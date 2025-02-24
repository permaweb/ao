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

  const __dirname = ctx.__dirname
  const saveEvaluationWorker = join(__dirname, 'effects', 'worker', 'saveEvaluation', 'index.js')
  const onCreateSaveEvaluationWorker = () => () => {
    const workerId = randomBytes(8).toString('hex')
    ctx.logger('Spinning up save evaluation worker with id "%s"...', workerId)

    return {
      workerThreadOpts: {
        workerData: {
          id: workerId,
          EVALUATION_RESULT_DIR: ctx.EVALUATION_RESULT_DIR,
          EVALUATION_RESULT_BUCKET: ctx.EVALUATION_RESULT_BUCKET
        }
      }
    }
  }
  const saveEvaluationWorkerPool = workerpool.pool(saveEvaluationWorker, {
    maxWorkers: ctx.EVALUATION_RESULT_BUCKET && ctx.EVALUATION_RESULT_DIR ? 2 : 0,
    onCreateWorker: onCreateSaveEvaluationWorker()
  })
  const saveEvaluationWorkQueue = new PQueue({ concurrency: 2 })

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
        return saveEvaluationWorkQueue.add(() =>
          Promise.resolve()
            .then(async () => await saveEvaluationWorkerPool.exec('saveEvaluationToDir', [args]))
            .catch((e) => {
              throw new Error(`Error in saveEvaluation worker: ${e}`)
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
