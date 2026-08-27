import { defaultTo, isEmpty, complement, path, propEq } from 'ramda'
import { LRUCache } from 'lru-cache'
import ConsistentHash from 'consistent-hash'

const isNotEmpty = complement(isEmpty)

export function bailoutWith ({ fetch, surUrl, processToHost, ownerToHost, fromModuleToHost }) {
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
   * A consistent hashing hashring is used, to minimize the amount of
   * processes that must swap hosts when hosts are added or removed
   */
  const hashring = new ConsistentHash({ weight: 400, distribution: 'uniform' })
  const processToHostCache = new LRUCache({ maxSize: 10_000_000, sizeCalculation: () => 8 })

  hosts.forEach(host => hashring.add(host))

  return async ({ processId, failoverAttempt = 0 }) => {
    if (failoverAttempt >= hosts.length) return

    if (bailout) {
      const bail = await bailout(processId)
      if (bail) return bail
    }

    if (failoverAttempt) {
      /**
       * Passing in a count will return an array of nodes,
       * first the one that handles the named resource,
       * then the following closest nodes around the hash ring.
       */
      const hosts = hashring.get(processId, failoverAttempt + 1)
      return hosts.pop()
    }

    if (processToHostCache.has(processId)) return processToHostCache.get(processId)

    /**
     * Only perform the expensive computation of hash once
     */
    const host = hashring.get(processId)
    processToHostCache.set(processId, host)
    return host
  }
}
