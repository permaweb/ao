import { LRUCache } from 'lru-cache'

/**
 * The pure business logic.
 *
 * Given a list of valid hosts, return a function that given the processId and failoverAttempt
 * will return a deterministic host from the valid hosts list.
 *
 * If the failoverAttempt exceeds the length of valid hosts list, then every host has
 * been attempted, and so return undefined, to be handled upstream
 */
export function determineHostWith ({ hosts = [] }) {
  const cache = new LRUCache({
    /**
       * 10MB
       */
    maxSize: 10_000_000,
    /**
       * A number is 8 bytes
       */
    sizeCalculation: () => 8
  })

  return ({ processId, failoverAttempt = 0 }) => {
    if (failoverAttempt >= hosts.length) return

    /**
       * Check cache, and hydrate if necessary
       */
    let hashSum = cache.get(processId)
    if (!hashSum) {
      hashSum = computeHashSumFromProcessId(processId)
      cache.set(processId, hashSum)
    }

    return hosts[(hashSum + failoverAttempt) % hosts.length]
  }
}

function computeHashSumFromProcessId (processId) {
  return processId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
}
