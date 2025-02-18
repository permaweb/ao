import base64url from 'base64url'
import { Buffer as BufferShim } from 'buffer/index.js'

/**
 * polyfill in Browser
 */
if (!globalThis.Buffer) globalThis.Buffer = BufferShim

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

function isBytes (value) {
  return value instanceof ArrayBuffer ||
    ArrayBuffer.isView(value)
}

function isPojo (value) {
  return !isBytes(value) &&
    typeof value === 'object' &&
    value !== null
}

function hbEncodeValue (value) {
  if (isBytes(value)) {
    if (value.byteLength === 0) return hbEncodeValue('')
    return [undefined, value]
  }

  if (typeof value === 'string') {
    if (value.length === 0) return [undefined, 'empty-binary']
    return [undefined, value]
  }

  if (Array.isArray(value) && value.length === 0) {
    return ['empty-list', undefined]
  }

  if (typeof value === 'number') {
    if (!Number.isInteger(value)) return ['float', `${value}`]
    return ['integer', `${value}`]
  }

  if (typeof value === 'symbol') {
    return ['atom', value.description]
  }

  throw new Error(`Cannot encode value: ${value.toString()}`)
}

function store (fullK, curK, dest, [type, value]) {
  const [encoded, types] = dest
  if (type) types[curK] = type
  if (value) encoded[fullK] = value
  return dest
}

// eslint-disable-next-line
function hbEncodeLift (obj, prefix = '', result = {}) {
  const cur = {}
  for (const [key, value] of Object.entries(obj)) {
    const flatK = prefix ? `${prefix}/${key}` : key

    if (isPojo(value)) {
      result[flatK] = value
      hbEncodeLift(value, flatK, result)
      continue
    }

    Object.assign(cur, hbEncodeValue(key, value))
  }

  if (Object.keys(cur).length === 0) return result

  if (prefix) result[prefix] = cur
  // Merge non-pojo values at top level
  else Object.assign(result, cur)
  return result
}

function hbEncode (obj, parent = '', result = {}) {
  const [flattened, types] = Object.entries(obj)
    .reduce((acc, [key, value]) => {
      const flatK = (parent ? `${parent}/${key}` : key)
        .toLowerCase()

      // skip nullish values
      if (value == null) return acc

      // // first/{idx}/name flatten array
      // if (Array.isArray(value)) {
      //   if (value.length === 0) {
      //     return store(flatK, key, acc, hbEncodeValue(value))
      //   }
      //   value.forEach((v, i) =>
      //     Object.assign(acc[0], hbEncode(v, `${flatK}/${i}`))
      //   )
      //   return acc
      // }

      // first/second flatten object
      if (isPojo(value)) {
        result[flatK] = value
        hbEncode(value, flatK, result)
        return acc
      }

      // leaf encode value
      return store(flatK, key, acc, hbEncodeValue(value))
    }, [{}, {}])

  if (Object.keys(flattened).length === 0) return result

  /**
   * Add the ao-types key for this specific object,
   * as a structured dictionary
   */
  const typesKey = (parent ? `${parent}/ao-types` : 'ao-types')
  flattened[typesKey] = Object.entries(types)
    .map(([key, value]) => `${key.toLowerCase()}=${value}`)
    .join(',')

  if (parent) result[parent] = flattened
  // Merge non-pojo values at top level
  else Object.assign(result, flattened)
  return result
}

function encodePart (name, { headers, body }) {
  headers.append('content-disposition', `form-data;name="${name}"`)
  const parts = Object
    .entries(headers)
    .reduce((acc, [name, value]) => {
      acc.push(`${name}: `, value, '\r\n')
      return acc
    }, [])

  // CRLF if always required, even with empty body
  parts.push('\r\n')
  if (body) parts.push(body)

  return new Blob(parts)
}

/**
 * Encode the object as HyperBEAM HTTP multipart
 * message. Nested objects are flattened to a single
 * depth multipart
 */
export async function encode (obj = {}) {
  if (Object.keys(obj) === 0) return

  const flattened = hbEncode(obj)

  /**
   * Some values may be encoded into headers,
   * while others may be encoded into the body
   */
  const bodyKeys = []
  const headerKeys = []
  await Promise.all(
    Object.keys(flattened).map(async (key) => {
      const value = flattened[key]

      // if (key === 'data') {
      //   bodyKeys.push(key)
      //   flattened[key] = new Blob([
      //     `content-disposition: form-data;name="${key}"\r\n\r\n`,
      //     value
      //   ])
      //   return
      // }
      /**
       * Sub maps are always encoded as subparts
       * in the body
       */
      if (isPojo(value)) {
        // Empty object or nil
        const subPart = await encode(value)
        if (!subPart) return

        bodyKeys.push(key)
        flattened[key] = encodePart(key, subPart)
        return
      }

      if (key.includes('/') || Buffer.from(value).byteLength > 4096) {
        bodyKeys.push(key)
        flattened[key] = new Blob([
          `content-disposition: form-data;name="${key}"\r\n\r\n`,
          value
        ])
        return
      }

      headerKeys.push(key)
      flattened[key] = value
    })
  )

  const h = new Headers()
  headerKeys.forEach((key) => h.append(key, flattened[key]))
  /**
   * Add headers that indicates and orders body-keys
   * for the purpose of determinstically reconstructing
   * content-digest on the server
   *
   * TODO: remove dead code. Apparently, this is only needed
   * on the HB side, but keeping the commented code here
   * just in case we need it client side.
   */
  // const bk = hbEncodeValue('body-keys', bodyKeys)
  // Object.keys(bk).forEach((key) => h.append(key, bk[key]))

  let body
  if (bodyKeys.length) {
    const bodyParts = await Promise.all(
      bodyKeys.map((name) => flattened[name].arrayBuffer())
    )

    /**
     * Generate a deterministic boundary, from the parts
     * to use for the multipart body boundary
     */
    const base = new Blob(
      bodyParts.flatMap((p, i, arr) =>
        i < arr.length - 1 ? [p, '\r\n'] : [p])
    )
    const hash = await sha256(await base.arrayBuffer())
    const boundary = base64url.encode(Buffer.from(hash))

    /**
     * Segment each part with the multipart boundary
     */
    const blobParts = bodyParts
      .flatMap((p) => [`--${boundary}\r\n`, p, '\r\n'])

    /**
     * Add the terminating boundary
     */
    blobParts.push(`--${boundary}--`)

    body = new Blob(blobParts)
    /**
     * calculate the content-digest
     */
    const contentDigest = await sha256(await body.arrayBuffer())
    const base64 = base64url.toBase64(base64url.encode(contentDigest))

    h.set('Content-Type', `multipart/form-data; boundary="${boundary}"`)
    h.append('Content-Digest', `sha-256=:${base64}:`)
  }

  return { headers: h, body }
}
