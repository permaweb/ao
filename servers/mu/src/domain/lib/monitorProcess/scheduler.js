




import { Worker } from 'worker_threads'
import pouchDbClient from '../../clients/pouchdb.js'
import { createLogger } from '../../logger.js'

const dbInstance = pouchDbClient.pouchDb('ao-cache')
const logger = createLogger('schedulr')

dbInstance.createIndex({
    index: {
      fields: ['type']
    }
  }).then(function () {
    console.log('Index created successfully');
  }).catch(function (err) {
    console.error('Error creating index:', err);
  });

const findLatestMonitors = pouchDbClient.findLatestMonitorsWith({pouchDb: dbInstance, logger})

async function runScheduled() {
    // console.log("Running monitored processes...")

    try{
        let monitors = await findLatestMonitors()
        console.log(monitors)
    } catch(e) {
        // console.log(e)
    }
}

export default runScheduled