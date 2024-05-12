import { LRUCache } from 'lru-cache'

export function bailoutWith ({ fetch, subrouterUrl, surUrl, owners }) {
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

  return async (processId) => {
    /**
     * All three of these must be set for the
     * subrouter logic to work so if any are
     * not set just return.
     */
    if (!subrouterUrl || !surUrl || !owners) return
    let owner = cache.get(processId)
    if (!owner) {
      const suResponse = await fetch(`${surUrl}/processes/${processId}`)
        .then((res) => res.json())
        .catch((_e) => null)
      if (!suResponse) return
      if (!suResponse.owner) return
      if (!suResponse.owner.address) return
      cache.set(processId, suResponse.owner.address)
      owner = suResponse.owner.address
    }

    if (owners.includes(owner)) {
      return subrouterUrl
    }
  }
}

/**
 * The pure business logic.
 *
 * Given a list of valid hosts, return a function that given the processId and failoverAttempt
 * will return a deterministic host from the valid hosts list.
 *
 * If the failoverAttempt exceeds the length of valid hosts list, then every host has
 * been attempted, and so return undefined, to be handled upstream
 */
export function determineHostWith ({ hosts = [], bailout }) {
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

  return async ({ processId, failoverAttempt = 0 }) => {
    if (failoverAttempt >= hosts.length) return

    if (bailout) {
      const bail = await bailout(processId)
      if (bail) return bail
    }

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
