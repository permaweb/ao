




import { Worker } from 'worker_threads'

function runScheduledWith({dbClient, dbInstance, logger}) {
    const findLatestMonitors = dbClient.findLatestMonitorsWith({pouchDb: dbInstance, logger})
    return async () => {
        try{
            let monitors = await findLatestMonitors()
            genWorker(monitors)
        } catch(e) {
            logger.error(e)
        }
    }
}

function genWorker(monitors) {
  const worker = new Worker('./src/domain/lib/monitor/worker.js');

  worker.postMessage({monitors: monitors, label: 'start'})

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