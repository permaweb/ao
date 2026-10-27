import { Sha256 } from '@aws-crypto/sha256-js'
import { defaultProvider } from '@aws-sdk/credential-provider-node'
import { HttpRequest } from '@smithy/protocol-http'
import { SignatureV4 } from '@smithy/signature-v4'

// Restrict credential-bearing requests to AWS S3 REST endpoints over TLS.
export function s3Region (url, fallbackRegion = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1') {
  if (url.protocol !== 'https:' || url.username || url.password) return null
  if ([...url.searchParams.keys()].some(key => /^(x-amz-signature|x-amz-algorithm|awsaccesskeyid|signature)$/i.test(key))) return null
  const match = url.hostname.match(/^(?:.+\.)?s3(?:[.-](?:dualstack\.)?([a-z]{2}(?:-[a-z]+)+-\d+))?\.amazonaws\.com(?:\.cn)?$/)
  return match ? match[1] || fallbackRegion : null
}

export const fetchConfigWith = ({ fetch = globalThis.fetch, credentials = defaultProvider(), signingDate } = {}) => {
  return async (location) => {
    const url = new URL(location)
    let response = await fetch(url.href, { signal: AbortSignal.timeout(15000) })
    const region = s3Region(url, response.headers.get('x-amz-bucket-region') || undefined)

    // Public S3 and HTTP sources need no credentials. A private S3 object returns 403.
    if (response.status === 403 && region) {
      await response.body?.cancel()
      const query = Object.create(null)
      for (const [key, value] of url.searchParams) {
        query[key] = [...(query[key] || []), value]
      }
      const signer = new SignatureV4({ service: 's3', region, credentials, sha256: Sha256, uriEscapePath: false })
      const signed = await signer.sign(new HttpRequest({
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port ? Number(url.port) : undefined,
        method: 'GET',
        path: url.pathname,
        query,
        headers: { host: url.host }
      }), { signingDate })
      // Never forward signed credentials through a redirect.
      response = await fetch(url.href, { headers: signed.headers, redirect: 'error', signal: AbortSignal.timeout(15000) })
    }

    if (!response.ok) {
      await response.body?.cancel()
      throw new Error(`Config request failed: HTTP ${response.status}`)
    }
    return response.json()
  }
}

// Update only after a successful fetch and validation; failures preserve the last good value.
export const configCacheWith = ({ read, location, validate, initialValue = null }) => {
  let current = initialValue
  return {
    get: () => current,
    refresh: async () => {
      if (!location) return
      const updated = await read(location)
      if (!validate(updated)) throw new Error('Invalid config JSON structure')
      current = updated
    }
  }
}

export const rateLimitConfigWith = ({ read = fetchConfigWith(), location, initialValue = {} }) => configCacheWith({
  read,
  location,
  initialValue,
  validate: value => value && typeof value === 'object' && !Array.isArray(value)
})
