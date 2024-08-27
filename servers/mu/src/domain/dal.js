import { z } from 'zod'
import { bufferSchema, processOwnerSchema, tagArraySchema } from './model.js'

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
 * @returns process metadata
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
  // args(
  //   z.string(),
  //   z.string().nullish()
  // )
  .returns(
    z.promise(
      z.object({
        url: z.string()
      })
    ))

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
