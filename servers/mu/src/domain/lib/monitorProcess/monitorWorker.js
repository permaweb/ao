

import { parentPort } from 'worker_threads';

let work = () => {};
let interval = 1000;

function performWork(savedDataItem) {
  console.log("Processing implicit interactions...")
  console.log(savedDataItem)
}

parentPort.on('message', (savedDataItem) => {
  performWork(savedDataItem);
  parentPort.postMessage("running");
  work = performWork
})


setInterval(() => work(), interval);
