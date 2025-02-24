import { defaultTo, isEmpty, complement, path, propEq } from 'ramda'
import { LRUCache } from 'lru-cache'

const isNotEmpty = complement(isEmpty)

export function bailoutWith ({ fetch, subrouterUrl, surUrl, owners, processToHost, ownerToHost, fromModuleToHost }) {
  const processToOwnerCache = new LRUCache({
    /**
       * 10MB
       */
    maxSize: 10_000_000,
    /**
       * A number is 8 bytes
       */
    sizeCalculation: () => 8
  })

  const fromModuleCache = new LRUCache({
    /**
       * 10MB
       */
    maxSize: 10_000_000,
    /**
       * A number is 8 bytes
       */
    sizeCalculation: () => 8 
  })

  async function findProcessOwner (processId) {
    const owner = processToOwnerCache.get(processId)
    if (owner) return owner

    return fetch(`${surUrl}/processes/${processId}`)
      .then((res) => res.json())
      .then(defaultTo({}))
      .then(path(['owner', 'address']))
      .then((owner) => {
        if (!owner) return null

        processToOwnerCache.set(processId, owner)
        return owner
      })
      .catch((_e) => null)
  }

  async function findFromModule (processId) {
    const module = fromModuleCache.get(processId)
    if (module) return module

    return fetch(`${surUrl}/processes/${processId}`)
      .then((res) => res.json())
      .then(defaultTo({}))
      .then(p => {
        return p.tags.find(propEq('From-Module', 'name'))?.value
      })
      .then((module) => {
        if (!module) return null

        fromModuleCache.set(processId, module)
        return module
      })
      .catch((_e) => null)
  }

  return async (processId) => {
    /**
     * If a process has a specific mapping configured,
     * then immediately return it's mapping
     */
    if (processToHost && processToHost[processId]) return processToHost[processId]
    /**
     * If there are owner -> host configured, then we lookup the process
     * owner and return the specific host if found
     */
    if (ownerToHost && isNotEmpty(ownerToHost)) {
      const owner = await findProcessOwner(processId)
      if (ownerToHost[owner]) return ownerToHost[owner]
    }

    /**
     * If there are fromModule -> host configured, then we lookup the 
     * from-module and return the specific host if found
     */
    if (fromModuleToHost && isNotEmpty(fromModuleToHost)) {
      const module = await findFromModule(processId)
      if (fromModuleToHost[module]) return fromModuleToHost[module]
    }
    
    /**
     * @deprecated - this functionality is subsumed by ownerToHost
     * and will eventually be removed
     *
     * All three of these must be set for the
     * subrouter logic to work so if any are
     * not set just return.
     */
    if (!subrouterUrl || !surUrl || !owners) return
    const owner = await findProcessOwner(processId)
    if (owners.includes(owner)) return subrouterUrl
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
  /**
   * TODO: should we inject this cache?
   */
  const processToHostCache = new LRUCache({
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
    let hashSum = processToHostCache.get(processId)
    if (!hashSum) {
      /**
       * Only perform the expensive computation of hash -> idx once and cache
       */
      hashSum = computeHashSumFromProcessId({ processId, length: hosts.length })
      processToHostCache.set(processId, hashSum)
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
