export function getProcessWith ({ getProcess, cache }) {
  /**
   * Get the process for the given id.
   *
   * @param {string} process - the id of the process
   * @returns {Promise<{ process: Process }>} - the process response
   */
  const getProcessResponse = cache.getProcessResponse
  const setProcessResponse = cache.setProcessResponse
  return (process) =>
    getProcessResponse(process)
      .then(async (cached) => {
        if (cached) return cached

        return Promise.resolve()
          .then(() => {
            return getProcess(process)
          })
          .then(async (processResponse) => {
            await setProcessResponse(process, processResponse, 6000)
            return processResponse
          })
      })
}
