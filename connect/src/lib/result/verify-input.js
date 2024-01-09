import { of } from 'hyper-async'
import { z } from 'zod'

const inputSchema = z.object({
  id: z.string().min(1, { message: 'message is required to be a message id' }),
  processId: z.string().min(1, { message: 'process is required to be a process id' })
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
