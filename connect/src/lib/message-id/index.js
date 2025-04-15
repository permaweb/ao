import { z } from 'zod'

const inputSchema = z
  .object({
    processId: z.string(),
    messageId: z.string()
  })
  .passthrough()

// need to get the suURL

/**
 * @callback MessageId
 * @param {Record<string, any>} fields
 * @returns {Promise<Response>} result
 *
 * @returns {ProcessId}
 */
export function messageIdWith (env) {
    /**
     * TODO: split into separate modules
     * wrap side effect with schema from dal
     */
    const getMessageId = env.getMessageId
    return (fields) => {
        fields = inputSchema.parse(fields)
        return getMessageId(fields)
    }

}  