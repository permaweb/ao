import { LRUCache } from 'lru-cache'

export function bailoutWith ({ fetch, subrouterUrl, surUrl, owners, processToHost }) {
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
     * If a process has a specific mapping configured,
     * then immediately return it's mapping
     */
    if (processToHost && processToHost[processId]) return processToHost[processId]

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
      /**
       * Only perform the expensive computation of hash -> idx once and cache
       */
      hashSum = computeHashSumFromProcessId({ processId, length: hosts.length })
      cache.set(processId, hashSum)
    }

    return hosts[(hashSum + failoverAttempt) % hosts.length]
  }
}

export function computeHashSumFromProcessId ({ processId, length }) {
  // return processId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return Number(BigInt(cyrb53(processId)) % BigInt(length))
}

/**
  cyrb53 (c) 2018 bryc (github.com/bryc)
  License: Public domain (or MIT if needed). Attribution appreciated.
  A fast and simple 53-bit string hash function with decent collision resistance.
  Largely inspired by MurmurHash2/3, but with a focus on speed/simplicity.
*/
const cyrb53 = (str, seed = 0) => {
  let h1 = 0xdeadbeef ^ seed; let h2 = 0x41c6ce57 ^ seed
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return 4294967296 * (2097151 & h2) + (h1 >>> 0)
}
