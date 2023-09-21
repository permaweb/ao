import { of } from 'hyper-async'
import { z } from 'zod'

const inputSchema = z.object({
  function: z.string().min(
    1,
    { message: 'function not provided on input' }
  )
})

/**
 * @typedef Context2
 * @property {string} id - the transaction id to be verified
 * @property {any} input
 * @property {any} wallet
 * @property {Tag2[]} tags
 *
 * @callback VerifyInput
 * @param {Context2} ctx
 *
 * @returns VerifyInput
 */
export function verifyInputWith () {
  return (ctx) => {
    return of(ctx.input)
      .map(inputSchema.parse)
      .map(() => ctx)
  }
}
