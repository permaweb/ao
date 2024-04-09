import { of, fromPromise } from 'hyper-async'
import z from 'zod'
import { assoc, __, defaultTo, concat } from 'ramda'

import { removeTagsByNameMaybeValue } from '../utils.js'

const ctxSchema = z.object({
  spawnSuccessTx: z.any()
}).passthrough()

export function buildSuccessTxWith ({ buildAndSign, logger }) {
  return (ctx) => {
    /**
     * Start with the Tags from the original spawned message
     */
    return of(ctx.cachedSpawn.spawn.Tags)
      .map(defaultTo([]))
      /**
       * Remove any tags that will be set explictly on
       * the success message, so to avoid conflicts
       */
      .map(removeTagsByNameMaybeValue('Data-Protocol', 'ao'))
      .map(removeTagsByNameMaybeValue('Variant'))
      .map(removeTagsByNameMaybeValue('Type'))
      /**
       * Append tags explicitly set by the MU on the success
       * message send to the spawning process
       */
      .map(concat(__, [
        { name: 'Data-Protocol', value: 'ao' },
        { name: 'Variant', value: 'ao.TN.1' },
        { name: 'Type', value: 'Message' },
        /**
         * aos interoperability
         *
         * set the Process tag to the id of the newly spawned Process
         * and Action to 'Spawned' such that it can be handled
         * by an aos Handler
         */
        { name: 'Process', value: ctx.processTx },
        { name: 'Action', value: 'Spawned' },
        /**
         * The id of the newly spawned Process
         *
         * TODO: Maybe be able to remove later, kept for backwards compat.
         */
        { name: 'AO-Spawn-Success', value: ctx.processTx }
      ]))
      .chain(fromPromise((tags) => buildAndSign({
        processId: ctx.cachedSpawn.processId,
        tags
      })))
      .map(assoc('spawnSuccessTx', __, ctx))
      .map(ctxSchema.parse)
      .map(logger.tap('Added spawnSuccessTx to ctx'))
  }
}
