// worker.js
import { workerData, parentPort } from 'node:worker_threads'
import AoLoader from './wasm.cjs'

async function work () {
  const handle = await AoLoader(workerData.wasm)
  const result = await handle(workerData.memory, workerData.msg, workerData.env)
  parentPort.postMessage(result)
}

work()
