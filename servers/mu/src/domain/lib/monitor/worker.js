import { parentPort } from 'worker_threads';

import { z } from 'zod';

const monitorSchema = z.object({
  id: z.string(),
  authorized: z.boolean(),
  lastFromSortKey: z.nullable(z.string()), 
  type: z.literal('monitor'), 
  interval: z.string(), 
  createdAt: z.number(), 
});

const monitorsListSchema = z.array(monitorSchema);

let monitorList = []

parentPort.on('message', (message) => {
  if(message.label === 'start') {
    monitorList = message.monitors
    const validationResult = monitorsListSchema.safeParse(monitorList);
    if (!validationResult.success) {
        parentPort.postMessage(`Invalid monitor list for start`)
        process.exit(1);
    } 
    setTimeout(() => processMonitors(), 1000)
    parentPort.postMessage(`Monitor worker started, monitors: ${message.monitors.length}`)
  } else if (message.label === 'addMonitor') {
    const validationResult = monitorsListSchema.safeParse(message.monitor);
    if (!validationResult.success) {
        parentPort.postMessage(`Invalid monitor added to worker`)
    } 
    monitorList.push(message.monitor)
    parentPort.postMessage(`New monitor added to worker: ${message.monitor.id}`)
  } else {
    parentPort.postMessage(`Invalid message`)
  }
})


async function processMonitors() {
    monitorList.map((monitor) => {
        if(shouldRun(monitor)) {
          processMonitor(monitor).then((result) => {
              parentPort.postMessage({monitor: result, label: 'updateMonitor'})
          })
        }
    })
}

async function processMonitor(monitor) {
    let updatedMonitor = monitor

    

    return updatedMonitor
}


// TODO: check if it has been the interval amount 
// of time since the last run or the processes block
function shouldRun(_monitor) {
  return true
}



