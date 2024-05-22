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
      /**
       * Only perform the expensive computation of hash -> idx once and cache
       */
      hashSum = computeHashSumFromProcessId({ processId, length: hosts.length })
      cache.set(processId, hashSum)
    }

    return hosts[(hashSum + failoverAttempt) % hosts.length]
  }
}

function base64UrlToBase64 (base64Url) {
  // Replace URL-safe characters with standard Base64 characters
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
  // Add padding characters if necessary
  while (base64.length % 4) base64 += '='
  return base64
}

function base64ToUint8Array (base64) {
  // Decode the Base64 string to a binary string
  const binaryString = atob(base64)

  // Create a Uint8Array to hold the binary data
  const len = binaryString.length
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i)

  return bytes
}

export function computeHashSumFromProcessId ({ processId, length }) {
  // Convert the Base64 URL-encoded hash to a Uint8Array
  const uint8Array = base64ToUint8Array(base64UrlToBase64(processId))

  let hashSum = BigInt(0)
  for (let i = 0; i < uint8Array.length; i++) hashSum = (hashSum << BigInt(8)) + BigInt(uint8Array[i])

  return Number(hashSum % BigInt(length))
}
