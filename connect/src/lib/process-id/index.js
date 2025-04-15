import { z } from 'zod'

const inputSchema = z
  .object({
    processId: z.string(),
    since: z.number().optional()
  })
  .passthrough()


/**
 * @callback ProcessId
 * @param {Record<string, any>} fields
 * @returns {Promise<Response>} result
 *
 * @returns {ProcessId}
 */
export function processIdWith (env) {
    /**
     * TODO: split into separate modules
     * wrap side effect with schema from dal
     */
    const processId = env.processId
    return (fields) => {
        fields = inputSchema.parse(fields)
        return processId(fields)
    }

}  