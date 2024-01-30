
import minimist from 'minimist'
import { z } from 'zod'
import { of } from 'hyper-async'
import cron from 'node-cron'
import PubSub from 'pubsub-js'

import { config } from './config.js'
import { createLogger } from './logger.js'
import { createApis } from './index.common.js'

export const configSchema = z.object({
    CU_URL: z.string().url('CU_URL must be a a valid URL'),
    MU_WALLET: z.record(z.any()),
    GATEWAY_URL: z.string(),
    UPLOADER_URL: z.string()
})

const logger = createLogger('cranker logger')
const apis = createApis({
    ...config,
    fetch,
    logger
})

var messageSub = async (_topic, data) => {
    await of({ resultMsg: data })
        .chain(apis.processMsg)
        .toPromise()
        .catch((e) => console.log(e))
}

var spawnSub = async (msg, data) => {
    console.log( msg, data )
}

function queueCronsWith ({ apis, processId }) {
    return async () => {
        // read the cursor from a file here 

        // return the cursor here, null if no messages
        console.log(apis.fetchCron)
        const cronResults = await of({ processId, cursor })
            .chain(apis.fetchCron)
            .toPromise()
            .catch((e) => console.log(e))

        console.log(cronResults)
    
        // cronResults.edges.forEach(res => {
        //     [...res.node.Messages].forEach(msg => 
        //         PubSub.publish('MESSAGE', { ...msg, processId })
        //     );
        //     [...res.node.Spawns].forEach(msg => 
        //         PubSub.publish('SPAWN', { ...msg, processId })
        //     );
        // })

        // save the cursor to a file here
    }
}

async function main () {
	const argv = minimist(process.argv.slice(2))

    let processId = 'ZHcPSyTkspHQTLBnJJwyQsSdqz2TulWEGvO4IsW74Tg'

    const queueCrons = queueCronsWith({ apis, processId })

    cron.schedule('*/10 * * * * *', queueCrons)

    PubSub.subscribe('MESSAGE', messageSub)
    PubSub.subscribe('SPAWN', spawnSub)
}

main().catch((e) => console.log(e))

