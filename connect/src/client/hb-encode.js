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
 * TODO: bundle into a separate package
 * ******
 */

const MAX_HEADER_LENGTH = 4096

async function hasNewline (value) {
  if (typeof value === 'string') return value.includes('\n')
  if (value instanceof Blob) {
    value = await value.text()
    return value.includes('\n')
  }
  if (isBytes(value)) return Buffer.from(value).includes('\n')

  return false
}

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
    !Array.isArray(value) &&
    !(value instanceof Blob) &&
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

  if (Array.isArray(value)) {
    if (value.length === 0) return ['empty-list', undefined]
    const encoded = value.reduce(
      (acc, cur) => {
        let [type, curEncoded] = hbEncodeValue(cur)
        if (!type) type = 'binary'
        acc.push(`(ao-type-${type}) ${curEncoded}`)
        return acc
      },
      []
    )
    return ['list', encoded.join(',')]
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

export function hbEncodeLift (obj, parent = '', top = {}) {
  const [flattened, types] = Object.entries({ ...obj })
    .reduce((acc, [key, value]) => {
      const flatK = (parent ? `${parent}/${key}` : key)
        .toLowerCase()

      // skip nullish values
      if (value == null) return acc

      // list of objects
      if (Array.isArray(value) && value.some(isPojo)) {
        /**
         * Convert the list of maps into an object
         * where keys are indices and values are the maps
         *
         * This will match the isPojo check below,
         * which will handle the recursive lifting that we want.
         */
        value = value.reduce((indexedObj, v, idx) =>
          Object.assign(indexedObj, { [idx]: v }), {})
      }

      // first/second lift object
      if (isPojo(value)) {
        /**
         * Encode the pojo on top, but then continuing iterating
         * through the current object level
         */
        hbEncodeLift(value, flatK, top)
        return acc
      }

      // leaf encode value
      const [type, encoded] = hbEncodeValue(value)
      if (encoded) {
        /**
         * This value is too large to be potentially encoded
         * in a multipart header, so we instead need to "lift" it
         * as a top level field on result, to be encoded as its own part
         *
         * So use flatK to preserve the nesting hierarchy
         * While ensure it will be encoded as its own part
         */
        if (Buffer.from(encoded).byteLength > MAX_HEADER_LENGTH) {
          top[flatK] = encoded
        /**
         * Encode at the current level as a normal field
         */
        } else acc[0][key] = encoded
      }
      if (type) acc[1][key] = type
      return acc
    }, [{}, {}])

  if (Object.keys(flattened).length === 0) return top

  /**
   * Add the ao-types key for this specific object,
   * as a structured dictionary
   */
  if (Object.keys(types).length > 0) {
    const aoTypes = Object.entries(types)
      .map(([key, value]) => `${key.toLowerCase()}=${value}`)
      .join(',')

    /**
     * The ao-types header was too large to encoded as a header
     * so lift to the top, to be encoded as its own part
     */
    if (Buffer.from(aoTypes).byteLength > MAX_HEADER_LENGTH) {
      const flatK = (parent ? `${parent}/ao-types` : 'ao-types')
      top[flatK] = aoTypes
    } else flattened['ao-types'] = aoTypes
  }

  if (parent) top[parent] = flattened
  // Merge non-pojo values at top level
  else Object.assign(top, flattened)
  return top
}

function encodePart (name, { headers, body }) {
  const parts = Object
    .entries(Object.fromEntries(headers))
    .reduce((acc, [name, value]) => {
      acc.push(`${name}: `, value, '\r\n')
      return acc
    }, [`content-disposition: form-data;name="${name}"\r\n`])

  if (body) parts.push('\r\n', body)

  return new Blob(parts)
}

/**
 * Encoded the object as a HyperBEAM HTTP Multipart Message
 * - Nested object are "lifted" to the top level, while preserving
 * the hierarchy using "/", to be encoded as a part in the multipart body
 *
 * - Adds "ao-types" field on each nested object, that defines types
 * for each nested field, encoded as a structured dictionary header on the part.
 *
 * - Conditionally "lifts" fields that too large to be encoded as headers,
 * to the top level, to be encoded as a separate part, while preserving
 * the hierarchy using "/"
 */
export async function encode (obj = {}) {
  if (Object.keys(obj) === 0) return

  const flattened = hbEncodeLift(obj)

  /**
   * Some values may be encoded into headers,
   * while others may be encoded into the body
   */
  const bodyKeys = []
  const headerKeys = []
  await Promise.all(
    Object.keys(flattened).map(async (key) => {
      const value = flattened[key]
      /**
       * Sub maps are always encoded as subparts
       * in the body.
       *
       * Since hbEncodeLift already lifts
       * objects to the top level, there should only ever
       * be 1 recursive call here.
       */
      if (isPojo(value)) {
        // Empty object or nil
        const subPart = await encode(value)
        if (!subPart) return

        bodyKeys.push(key)
        flattened[key] = encodePart(key, subPart)
        return
      }

      /**
       * There are special cases that will force a field to be
       * encoded into the body:
       *
       * - The field includes any whitespace
       * - The field includes '/'
       * - The fields size exceeds the max header length
       *
       * In all cases, the field is forced to be encoded into the body
       * as a sub-part, where the part has a single Content-Disposition
       * header denoting the field, and the body of the sub-part
       * being the field value itself.
       *
       * (These special cases happen to cover a multitude of issues that
       * could cause a Data Item's 'data' to not be encodable as a header,
       * but extends that coverage to any sort of field)
       */
      if (
        await hasNewline(value) ||
        key.includes('/') ||
        Buffer.from(value).byteLength > MAX_HEADER_LENGTH
      ) {
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

  // If there is a data field that didn't otherwise get encoded into a multipart body,
  // and there are no other body parts, then we need to encode the data as an
  // `inline-body-key`. While doing so, we remove the `data` header that would
  // otherwise be duplicated.
  if (h.has('data')) {
    bodyKeys.push('data')
  }
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

  let body, finalContent
  if (bodyKeys.length) {
    if (bodyKeys.length === 1) {
      // If there is only one element, promote it to be the full body and set the
      // `inline-body-key` such that the server knows its name.
      body = new Blob([obj.data])
      h.append('inline-body-key', bodyKeys[0])
      h.delete(bodyKeys[0])
    } else {
      // This is a multipart body, so we generate and insert the boundary
      // appropriately.
      const bodyParts = await Promise.all(
        bodyKeys.map((name) => {
          return flattened[name].arrayBuffer()
        })
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

      h.set('Content-Type', `multipart/form-data; boundary="${boundary}"`)
      body = new Blob(blobParts)
    }
    /**
     * calculate the content-digest
     */
    finalContent = await body.arrayBuffer()
    const contentDigest = await sha256(finalContent)
    const base64 = base64url.toBase64(base64url.encode(contentDigest))

    h.append('Content-Digest', `sha-256=:${base64}:`)
  }

  // console.log('Encoded headers:')
  // console.log(h)
  // console.log('Encoded body:')
  // console.log(finalContent)

  return { headers: h, body }
}
