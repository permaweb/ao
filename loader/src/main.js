import { Worker } from 'node:worker_threads'
import path from 'path'

const workerFile = path.join(__dirname, 'worker.js')

function runService (workerData) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(workerFile, { workerData })
    worker.on('message', resolve)
    worker.on('error', reject)
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`))
      }
    })
    setTimeout(() => {
      worker.terminate()
      reject(new Error('Worker exceeded execution time limit'))
    }, 1000)
  })
}

export async function handle (wasm, memory, msg, env) {
  return await runService({ wasm, memory, msg, env })
}
