import { of } from 'hyper-async'
import { z } from 'zod'

const inputSchema = z.object({
  id: z.string().min(1, { message: 'id is required to be a message id' })
})

/**
 * @callback VerifyInput
 *
 * @returns {VerifyInput}
 */
export function verifyInputWith () {
  return (ctx) => {
    return of(ctx)
      .map(inputSchema.parse)
      .map(() => ctx)
  }
}
