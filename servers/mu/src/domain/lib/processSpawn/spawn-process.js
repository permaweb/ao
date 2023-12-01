import { of, fromPromise, Rejected } from 'hyper-async'
import { __, assoc } from 'ramda'
import z from 'zod'

const ctxSchema = z.object({
  contractTx: z.any()
}).passthrough()

export function spawnProcessWith (env) {
  const { logger, writeProcessTx } = env

  return (ctx) => {
    const { tags } = ctx.cachedSpawn.spawn
    let initState = {}
    const initStateTag = tags.find((tag) =>
      tag.name === 'Initial-State'
    )
    if (initStateTag) {
      initState = JSON.parse(initStateTag.value)
    }
    const srcTag = tags.find((tag) =>
      tag.name === 'Contract-Src'
    )
    if (!srcTag) return Rejected(ctx)

    const tagsIn = tags.filter(tag => ![
      'Contract-Src',
      'Initial-State',
      'Data-Protocol',
      'ao-type'
    ].includes(tag.name))

    const transformedData = { initState, src: srcTag.value, tags: tagsIn }

    return of(transformedData)
      .chain(fromPromise(writeProcessTx))
      .bichain(
        (error) => {
          console.error('writeProcessTx failed. Recovering and returning original ctx.', error)
          return of(ctx)
        },
        (result) => {
          return of(result)
            .map(assoc('processTx', __, ctx))
            .map(ctxSchema.parse)
            .map(logger.tap('Added "processTx" to ctx'))
        }
      )
  }
}
