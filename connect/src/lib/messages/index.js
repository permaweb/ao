import { z } from 'zod'

const inputSchema = z
  .object({
    processId: z.string(),
    from: z.string(),
    to: z.string(),
    limit: z.string().default('1000').optional()
  })
  .passthrough()

/**
 * @callback Messages
 * @param {Record<string, any>} fields
 * @returns {Promise<Response>} result
 *
 * @returns {Messages}
 */
export function messagesWith (env) {
  const messages = env.messages
  return (fields) => {
    fields = inputSchema.parse(fields)
    return messages(fields)
  }
}
