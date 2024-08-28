import { z } from 'zod'
import { assignmentArraySchema, bufferSchema, messageArraySchema, processOwnerSchema, spawnArraySchema, tagArraySchema } from './model.js'

/**
 * ###################
 * ###### Cron #######
 * ###################
*/

/**
 * startMonitoredProcess
 * Given a process ID, begin monitoring it every 10 seconds
 *
 * @param processId - the process to monitor
 */
export const startProcessMonitorSchema = z.function()
  .args(
    z.object({
      processId: z.string()
    })
  )

/**
 * killMonitoredProcess
 * Given a process ID, stop monitoring it
 *
 * @param processId - the process to unmonitor
 */
export const killMonitoredProcessSchema = z.function()
  .args(
    z.object({
      processId: z.string()
    })
  )

/**
 * ###################
 * ####### CU ########
 * ###################
 */

/**
 * result (fetchResult)
 * Given a tx-id and a processId, retrieve the result of that tx from the CU
 *
 * @param txId - the tx-id to query
 * @param processId - the processId to query
 * @param logId - The logId to aggregate the logs by
 *
 * @returns
 * Messages - An array of messages to be pushed
 * Assignments - An array of assignments to be pushed
 * Spawns - An array of spawns to be pushed
 * Output - The message's output
 * GasUsed - The gas used to process the current message
 */
export const resultSchema = z.function()
  .args(
    z.string(),
    z.string(),
    z.string()
  )
  .returns(
    z.promise(
      z.object({
        Messages: messageArraySchema,
        Assignments: assignmentArraySchema,
        Spawns: spawnArraySchema,
        Output: z.any(),
        GasUsed: z.number().nullish()
      })
    )
  )

/**
 * fetchCron
 * Given a process and a cursor, fetch the cron from the CU
 *
 * @param processId - The process to fetch the cron of
 * @param cursor - The cursor to begin at
 *
 * @returns
 * hasNextPage - whether the cron results has another page
 * edges - an array of cron output. Includes Messages, Assignments, Spawns, and Output
 */
export const fetchCronSchema = z.function()
  .args(
    z.object({
      processId: z.string(),
      cursor: z.string().nullish()
    })
  )
  .returns(
    z.promise(
      z.object({
        hasNextPage: z.boolean().nullish(),
        edges: z.array(
          z.object({
            cursor: z.string().nullish(),
            node: z.object({
              Messages: messageArraySchema,
              Assignments: assignmentArraySchema,
              Spawns: spawnArraySchema,
              Output: z.any()
            })
          })
        )
      })
    )
  )
/**
 * ###################
 * ##### Gateway #####
 * ###################
 */

/**
 * @name isWallet
 * Given an id, check if it is a process or a wallet.
 * First, check the cache. Then, check Arweave.
 *
 * @param id - The id to check if it is a process or a wallet
 * @param logId - The logId to aggregate the logs by
 *
 * @returns isWallet - If the id is a wallet, return true. Otherwise, return false.
 */
export const isWalletSchema = z.function()
  .args(
    z.string(), z.string()
  ).returns(
    z.promise(
      z.boolean()
    )
  )

/**
 * ###################
 * ### Scheduler #####
 * ###################
 */

/**
 * fetchSchedulerProcess
 * Given a processId and a suUrl, find process information
 * in the cache or fetch it from the SU.
 *
 * @param {string} processId - The processId of to retrieve information of
 * @param {string} suUrl - The SU location to fetch the information from
 * @param {string} logId - The logId to aggregate the logs by
 *
 * @returns
 * processId
 * block - the block number of the process
 * owner - the key and address of the process owner
 * tags
 * data
 * anchor
 * epoch
 * nonce
 * signature
 *
 */
export const fetchSchedulerProcessSchema = z.function()
  .args(
    z.string(),
    z.string(),
    z.string()
  )
  .returns(
    z.promise(
      z.object({
        process_id: z.string(),
        block: z.string(),
        owner: processOwnerSchema,
        tags: tagArraySchema,
        timestamp: z.coerce.number(),
        data: z.string(),
        anchor: z.string().nullish(),
        epoch: z.coerce.number().nullish(),
        nonce: z.coerce.number().nullish(),
        signature: z.string()
      })
    )
  )

/**
 * writeDataItem
 * Given a dataItem and a suUrl, forward the message to the SU
 * to be posted to Arweave.
 *
 * @param data - the data to forward
 * @param suUrl - the SU to forward the data to
 * @param logId - The logId to aggregate the logs by
 *
 * @returns
 * id - the tx-id of the data item
 * timestamp
 */
export const writeDataItemSchema = z.function()
  .args(
    z.object({
      data: z.string(),
      suUrl: z.string(),
      logId: z.string().nullish()
    })
  )
  .returns(
    z.promise(
      z.object({
        id: z.string(),
        timestamp: z.coerce.number()
      })
    )
  )

/**
 * writeAssignment
 * Forward an assignment to the SU
 *
 * @param txId - the tx-id of the message to assign
 * @param processId - the process to assign the message to
 * @param baseLayer - whether the assignment is part of an L1 transaction
 * @param exclude - fields to exclude during the assignment
 * @param suUrl - the SU to forward the assign to
 * @param logId - The logId to aggregate the logs by
 */
export const writeAssignmentSchema = z.function()
  .args(
    z.object({
      txId: z.string(),
      processId: z.string(),
      baseLayer: z.string().nullish(),
      exclude: z.boolean().nullish(),
      suUrl: z.string(),
      logId: z.string().nullish()
    })
  )
  .returns(
    z.promise(
      z.object({
        id: z.string(),
        timestamp: z.coerce.number()
      })
    )
  )

/**
 * ###################
 * # Scheduler Utils #
 * ###################
 */

/**
 * locate
 * Locate the scheduler for the given process.
 *
 * @param process - the id of the process
 * @param [schedulerHint] - the id of owner of the scheduler, which prevents having to query the process
 * from a gateway, and instead skips to querying Scheduler-Location
 * @returns {Promise<{ url: string, address: string }>} - an object whose url field is the Scheduler Location
 */
export const locateProcessSchema = z.function()
  // .args(
  //   z.string(),
  //   z.string().nullish()
  // )
  .returns(
    z.promise(
      z.object({
        url: z.string(),
        address: z.string().nullish()
      })
    ))

/**
 * raw
 * Return the `Scheduler-Location` record for the address
 * or undefined, if it cannot be found
 *
 * @param address - the wallet address used by the Scheduler
 * @returns whether the wallet address is Scheduler
 */
export const rawSchema = z.function()
  .args(
    z.string()
  )
  .returns(
    z.promise(
      z.object({
        url: z.string()
      }).nullish()
    )
  )
/**
 * ###################
 * ##### Signer ######
 * ###################
 */

/**
 * @name buildAndSign
 * Given some metadata, create a signed data item.
 *
 * @param processId
 * @param data
 * @param tags
 * @param anchor
 *
 * @returns id - the data item's id
 * @returns data - the data item's raw data as a buffer array
 * @returns processId - the data item's process id
 */
export const buildAndSignSchema = z.function()
  .args(
    z.object({
      processId: z.string(),
      data: z.string().nullish(),
      tags: tagArraySchema,
      anchor: z.string()
    })
  )
  .returns(
    z.promise(
      z.object({
        id: z.string(),
        data: bufferSchema,
        processId: z.string()
      })
    )
  )

/**
 * ###################
 * #### Uploader #####
 * ###################
 */

/**
 * uploadDataItem
 * Upload a Data Item directly to Arweave
 *
 * @param data - the Data Item to upload
 *
 * @returns
 * id - The Arweave tx-id of the uploaded data
 * timestamp
 * signature
 * owner
 *
 */
export const uploadDataItemSchema = z.function()
  .args(
    bufferSchema
  )
  .returns(
    z.promise(
      z.object({
        id: z.string(),
        timestamp: z.coerce.number(),
        signature: z.string().nullish(),
        owner: z.string().nullish()
      })
    )
  )
