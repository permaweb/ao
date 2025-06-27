import { of, fromPromise, Resolved } from 'hyper-async'
import z from 'zod'
import { assoc, __, defaultTo } from 'ramda'

import { checkStage, removeTagsByNameMaybeValue } from '../utils.js'

const ctxSchema = z.object({
  spawnSuccessTx: z.any()
}).passthrough()

export function buildSuccessTxWith ({ buildAndSign, logger }) {
  return (ctx) => {
    /**
     * Start with the Tags from the original spawned message
    */
    if (!checkStage('build-success-tx')(ctx)) return Resolved(ctx)
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
      .map((tags) => {
        const successTags = [
          { name: 'Data-Protocol', value: 'ao' },
          { name: 'Type', value: 'Message' },
          /**
           * aos interoperability
           *
           * set the Process tag to the id of the newly spawned Process
           * and Action to 'Spawned' such that it can be handled
           * by an aos Handler
           */
          { name: 'Process', value: ctx.processTx },
          { name: 'Action', value: 'Spawned' }
        ]

        // Preserve the original Variant tag from the spawn if it exists
        const originalVariant = ctx.cachedSpawn.spawn.Tags?.find(tag => tag.name === 'Variant')
        if (originalVariant) {
          successTags.push({ name: 'Variant', value: originalVariant.value })
        } else {
          successTags.push({ name: 'Variant', value: 'ao.TN.1' })
        }

        return tags.concat(successTags)
      })
      .chain(fromPromise((tags) => buildAndSign({
        processId: ctx.cachedSpawn.processId,
        tags
      })))
      .map(assoc('spawnSuccessTx', __, ctx))
      .map(ctxSchema.parse)
      .bimap(
        (e) => {
          return new Error(e, { cause: ctx })
        },
        logger.tap({ log: 'Added spawnSuccessTx to ctx' })
      )
  }
}
