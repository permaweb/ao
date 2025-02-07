import base64url from 'base64url'
import { Buffer } from 'buffer/index.js'

/**
 * polyfill in Browser
 */
if (!globalThis.Buffer) globalThis.Buffer = Buffer

/**
 * ******
 * HyperBEAM Http Encoding
 *
 * TODO: bundle into a package with
 *
 * - export encode()
 * - export encodeDataItem() to convert object
 * or ans104 to http message
 * - exported signers for both node and browser environments
 * (currently located in wallet.js modules)
 * ******
 */

/**
 * @param {ArrayBuffer} data
 */
async function sha256 (data) {
  return crypto.subtle.digest('SHA-256', data)
}

function hbEncodeValue (key, value) {
  const typeK = `converge-type-${key}`

  if (typeof value === 'string') {
    if (value.length === 0) return { [typeK]: 'empty-binary' }
    return { [key]: value }
  }

  if (Array.isArray(value) && value.length === 0) {
    return { [typeK]: 'empty-list' }
  }

  if (typeof value === 'number') {
    if (!Number.isInteger(value)) return { [typeK]: 'float', [key]: `${value}` }
    return { [typeK]: 'integer', [key]: `${value}` }
  }

  if (typeof value === 'symbol') {
    return { [typeK]: 'atom', [key]: value.description }
  }

  throw new Error(`Cannot encode value: ${value.toString()}`)
}

function hbEncode (obj, parent = '') {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    const flatK = (parent ? `${parent}/${key}` : key)
      .toLowerCase()

    // skip nullish values
    if (value == null) return acc
    // first/{idx}/name flatten array
    if (Array.isArray(value)) {
      if (value.length === 0) {
        Object.assign(acc, hbEncodeValue(flatK, value))
      }
      value.forEach((v, i) =>
        Object.assign(acc, hbEncode(v, `${flatK}/${i}`))
      )
      // first/second flatten object
    } else if (typeof value === 'object' && value !== null) {
      Object.assign(acc, hbEncode(value, flatK))
      // leaf encode value
    } else {
      Object.assign(acc, hbEncodeValue(flatK, value))
    }

    return acc
  }, {})
}

async function boundaryFrom (bodyParts = []) {
  const base = new Blob(
    bodyParts.flatMap((p, i, arr) =>
      i < arr.length - 1 ? [p, '\r\n'] : [p])
  )

  const hash = await sha256(await base.arrayBuffer())
  return base64url.encode(Buffer.from(hash))
}

/**
 * Encode the object as HyperBEAM HTTP multipart
 * message. Nested objects are flattened to a single
 * depth multipart
 */
export async function encode (obj = {}) {
  if (Object.keys(obj) === 0) return

  /**
   * TODO: all of these must be prefixed with body
   * in order for the content digest to match
   */
  const flattened = hbEncode(obj, 'body')
  const bodyParts = await Promise.all(
    Object
      .keys(flattened)
      /**
       * consistent ordering
       */
      .sort()
      .map((name) => new Blob([
        `content-disposition: form-data;name="${name}"\r\n\r\n`,
        flattened[name]
      ]).arrayBuffer())
  )

  const boundary = await boundaryFrom(bodyParts)

  /**
   * Segment each part with the multipart boundary
   */
  const blobParts = bodyParts
    .flatMap((p) => [`--${boundary}\r\n`, p, '\r\n'])

  /**
   * Add the terminating boundary
   */
  blobParts.push(`--${boundary}--`)

  const body = new Blob(blobParts)
  /**
   * calculate the content-digest
   */
  const contentDigest = await sha256(await body.arrayBuffer())
  const base64 = base64url.toBase64(base64url.encode(contentDigest))

  const headers = new Headers()
  headers.set('Content-Type', `multipart/form-data; boundary="${boundary}"`)
  headers.append('Content-Digest', `sha-256=:${base64}:`)
  return { headers, body }
}
