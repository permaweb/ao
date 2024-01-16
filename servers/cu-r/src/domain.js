/**
 * The pure business logic.
 *
 * Given a list of valid hosts, return a function that given the processId and failoverAttempt
 * will return a deterministic host from the valid hosts list.
 *
 * If the failoverAttempt exceeds the length of valid hosts list, then every host has
 * been attempted, and so return undefined, to be handled upstream
 */
export function determineHostWith ({ hosts = [], cache }) {
  function stringToUniqueId (str) {
    return str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  }

  return ({ processId, failoverAttempt }) => {
    if (failoverAttempt >= hosts.length) return

    /**
       * Check cache, and hydrate if necessary
       */
    let uniqueId = cache.get(processId)
    if (!uniqueId) {
      uniqueId = stringToUniqueId(processId)
      cache.set(processId, uniqueId)
    }

    return hosts[(uniqueId + failoverAttempt) % hosts.length]
  }
}
