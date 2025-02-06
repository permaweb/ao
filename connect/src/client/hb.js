import { Buffer } from 'buffer/index.js'
import { Rejected, fromPromise, of } from 'hyper-async'

function base64urlDecode (encoded) {
  const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = new Uint8Array([...binary].map(char => char.charCodeAt(0)))
  return bytes
}

/**
 * NOTE: this is base64 NOT base64url
 */
function base64Encode (buffer) {
  const base64 = btoa(String.fromCharCode(...buffer))
  return base64
}

async function toMultipartBody (data, contentType) {
  const boundary = `--${Math.random().toString(36).slice(2)}`
  const blob = new Blob([
    `--${boundary}\r\n`,
    'content-disposition: inline\r\n',
    /**
     * Optionally include the content-type header
     * in the body part
     */
    `${contentType ? `Content-Type: ${contentType.trim()}` : ''}\r\n`,
    data,
    `\r\n--${boundary}--\r\n`
  ])

  return { boundary, body: blob }
}

/**
 * @param {Blob} data
 */
async function sha256 (data) {
  const ab = await data.arrayBuffer()
  const hashAb = await crypto.subtle.digest('SHA-256', ab)
  return Buffer.from(hashAb)
}

async function itemToMultipart ({ processId, data, tags, anchor }) {
  const headers = new Headers()

  if (processId) headers.append('target', processId)
  if (anchor) headers.append('anchor', anchor)
  tags.forEach(t => headers.append(t.name, t.value))
  /**
   * Always ensure the variant is mainnet for hyperbeam
   * TODO: change default variant to be this eventually
   */
  headers.set('Variant', 'ao.N.1')

  /**
   * We need to encode the data as a part in a multipart body,
   * ensuring content-type is preserved and appending a
   * Content-Digest header
   */
  let body
  if (data) {
    /**
     * Make sure to include the Content-Type describing the data
     * into the part
     */
    const contentType = headers.get('content-type')
    const mp = await toMultipartBody(data, contentType)
    body = mp.body
    /**
     * Use set to always ensure the Content-Type is native HB
     * http encoding
     */
    headers.set('Content-Type', `multipart/form-data; boundary="${mp.boundary}"`)
    const hash = await sha256(body)
    headers.append('Content-Digest', `sha-256=:${base64Encode(hash)}:`)
  }

  return { headers, body }
}

function toSignerArgs ({ url, method, headers }) {
  headers = new Headers(headers)
  return {
    /**
     * Always sign all headers, and the path,
     * and that there is a deterministic signature
     * component ordering
     *
     * TODO: removing path from signing, for now.
     */
    fields: [
      ...headers.keys()
      // '@path'
    ].sort(),
    request: { url, method, headers: { ...Object.fromEntries(headers) } }
  }
}

export function httpSigName (address) {
  const decoded = base64urlDecode(address)
  const hexString = [...decoded.subarray(1, 9)]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
  return `http-sig-${hexString}`
}

export function deployProcessWith ({ fetch, logger: _logger, HB_URL, signer }) {
  const logger = _logger.child('deployProcess')

  return (args) => {
    return of(args)
      /**
       * disregard data item signer passed, as it is not needed
       * when the HTTP msg is what is actually signed
       */
      .chain(fromPromise(({ processId, data, tags }) =>
        itemToMultipart({ processId, data, tags })
      ))
      .chain(fromPromise(({ headers, body }) => {
        return signer(toSignerArgs({
          url: `${HB_URL}/~scheduler@1.0/schedule`,
          method: 'POST',
          headers
        })).then((req) => ({ ...req, body }))
      }))
      .map(logger.tap('Sending HTTP signed message to HB MU: %o'))
      .chain((request) => of(request)
        .chain(fromPromise(({ url, method, headers, body }) =>
          fetch(url, { method, headers, body, redirect: 'follow' })
        ))
        .bichain(
          (err) => Rejected(err),
          fromPromise(async (res) => {
            console.log('deploy process', res)
            if (res.ok) return res.headers.get('process')
            throw new Error(`${res.status}: ${await res.text()}`)
          })
        )
        .bimap(
          logger.tap('Error encountered when deploying process via HB MU'),
          logger.tap('Successfully deployed process via HB MU')
        )
        .map((process) => ({ processId: process }))
      )
      .toPromise()
  }
}

export function deployMessageWith ({ fetch, logger: _logger, HB_URL, signer }) {
  const logger = _logger.child('deployMessage')

  return (args) => {
    return of(args)
      /**
       * disregard data item signer passed, as it is not needed
       * when the HTTP msg is what is actually signed
       */
      .chain(fromPromise(({ processId, data, tags, anchor }) =>
        itemToMultipart({ processId, data, tags, anchor })
      ))
      .chain(fromPromise(({ headers, body }) => {
        return signer(toSignerArgs({
          url: `${HB_URL}/~process@1.0/schedule`,
          method: 'POST',
          headers
        })).then((req) => ({ ...req, body }))
      }))
      .map(logger.tap('Sending HTTP signed message to HB MU: %o'))
      .chain((request) => of(request)
        .chain(fromPromise(({ url, method, headers, body }) =>
          fetch(url, { method, headers, body, redirect: 'follow' })
        ))
        .bichain(
          (err) => Rejected(err),
          fromPromise(async (res) => {
            console.log('deploy message', res)
            if (res.ok) return res.headers.get('slot')
            throw new Error(`${res.status}: ${await res.text()}`)
          })
        )
        .bimap(
          logger.tap('Error encountered when writing message via HB MU'),
          logger.tap('Successfully wrote message via HB MU')
        )
        .map((slot) => ({ messageId: slot }))
      )
      .toPromise()
  }
}

export function loadResultWith ({ fetch, logger: _logger, HB_URL, signer }) {
  const logger = _logger.child('loadResult')

  return (args) => {
    return of(args)
      .chain(fromPromise(async ({ id, processId }) => {
        const { headers, body } = await itemToMultipart({ processId })
        headers.append('slot', id)
        return signer(toSignerArgs({
          url: `${HB_URL}/~compute-lite@1.0/compute&slot=${id}&process-id=${processId}`,
          method: 'POST',
          headers
        })).then((req) => ({ ...req, body }))
      }))
      .map(logger.tap('fetching message result from HB CU: %o'))
      .chain((request) => of(request)
        .chain(fromPromise(({ url, method, headers, body }) =>
          fetch(url, { method, headers, body, redirect: 'follow' })
        ))
        .bichain(
          (err) => Rejected(err),
          fromPromise(async (res) => {
            if (res.ok) return res.json()
            throw new Error(`${res.status}: ${await res.text()}`)
          })
        )
        .bimap(
          logger.tap('Error encountered when writing message via HB CU'),
          logger.tap('Successfully wrote message via HB CU')
        )
      )
      .toPromise()
  }
}

export function relayerWith ({ fetch, logger, HB_URL, signer }) {
  /**
   * A fetch wrapper that will sign
   *
   * This will then redirect calls to the
   * configured HyperBEAM node, specifically to the
   * relay device
   */
  return async (url, options) => {
    const parsed = new URL(url)
    options.headers = new Headers(options.headers)
    const relayUrl = parsed.href
    /**
     * TODO: should we only use a header instead?
     * For now, including both header and query param
     */
    const relayParams = new URLSearchParams({ 'relay-path': relayUrl })

    const hb = `${HB_URL}/~relay@1.0/call?${relayParams.toString()}`
    logger('Relaying "%s" through HyperBEAM Node "%s"', parsed.href, hb)

    /**
     * Only sign the relay-path header being added
     *
     * TODO: should we mimick a fetch error on failure to sign
     * ie. TypeError? For now, just letting this bubble
     */
    const { headers: signedHeaders } = await signer({
      fields: [
        ...options.headers.keys(),
        'relay-path'
      ].sort(),
      request: {
        url,
        ...options,
        headers: { ...Object.fromEntries(options.headers), 'relay-path': relayUrl }
      }
    })

    return fetch(hb, { ...options, headers: signedHeaders })
  }
}
