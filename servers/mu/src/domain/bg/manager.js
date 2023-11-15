

import { Worker } from 'worker_threads'


/**
 * a function run at server start up this boots
 * the Worker which handles scheduled messages
 */
function runScheduledWith() {
    return async () => {
        try{
            genWorker()
        } catch(e) {
            console.log(e)
        }
    }
}

/**
 * create the worker to handled scheduled messages
 */
function genWorker() {
  const worker = new Worker('./src/domain/bg/worker.js');

  worker.postMessage({label: 'start'})

  worker.on('message', (result) => {
      console.log(`Received from worker: ${result}`);
  });

  worker.on('error', (error) => {
      console.error(`Worker error: ${error}`);
  });

  worker.on('exit', (code) => {
      if (code !== 0) {
          console.error(`Worker stopped with exit code ${code}`);
      }
  });
}

export default runScheduledWith