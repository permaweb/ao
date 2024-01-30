
import warpArBundles from 'warp-arbundles'
import { connect as schedulerUtilsConnect } from '@permaweb/ao-scheduler-utils'

import { fromPromise } from 'hyper-async'

import cuClient from './clients/cu.js'
import schedulerClient from './clients/scheduler.js'
import signerClient from './clients/signer.js'
import uploaderClient from './clients/uploader.js'

import { processMsgWith } from './lib/processMsg/index.js'

const { DataItem } = warpArBundles

const createDataItem = (raw) => new DataItem(raw)

/**
 * initialize the library functions and inject dependences
 */

export const createApis = (ctx) => {
    const CU_URL = ctx.CU_URL
    const MU_WALLET = ctx.MU_WALLET
    const UPLOADER_URL = ctx.UPLOADER_URL

    const { locate, raw } = schedulerUtilsConnect({ cacheSize: 100, GATEWAY_URL: ctx.GATEWAY_URL })

    const logger = ctx.logger

    const processMsgLogger = logger.child('processMsg')
    const processMsg = processMsgWith({
        selectNode: cuClient.selectNodeWith({ CU_URL, logger: processMsgLogger }),
        createDataItem,
        locateScheduler: raw,
        locateProcess: locate,
        writeDataItem: schedulerClient.writeDataItemWith({ fetch, logger: processMsgLogger }),
        buildAndSign: signerClient.buildAndSignWith({ MU_WALLET, logger: processMsgLogger }),
        fetchResult: cuClient.resultWith({ fetch, CU_URL, logger: processMsgLogger }),
        logger,
        writeDataItemArweave: uploaderClient.uploadDataItemWith({ UPLOADER_URL, logger: processMsgLogger, fetch })
    })

    function fetchCronWith() {
        return (ctx) => {
            console.log(ctx)
            return of(ctx)
                .chain(fromPromise(cuClient.fetchCronWith({ CU_URL })))
                // .map((res) => {
                //     console.log(res)
                //     return {
                //         messages: res.edges.map((edge) => {
                //             return edge.node.Messages
                //         }).flat(),
                //         spawns: res.edges.map((edge) => {
                //             return edge.node.Spawns
                //         }).flat(),
                //         cursor: res.edges.length > 1 ? res.edges[res.edges.length - 1].cursor : ctx.cursor
                //     }
                // })
        }
    }

    const fetchCron = fromPromise(cuClient.fetchCronWith({ CU_URL }))

    return { processMsg, fetchCron }
}
