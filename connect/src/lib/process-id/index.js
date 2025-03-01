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
        return processId(fields)
    }

}  