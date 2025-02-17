/* eslint-disable camelcase */
import base64url from 'base64url'

const MAX_TAG_BYTES = 4096

/**
 * Copied from @dha-team/arbundles
 *
 * TODO:
 *
 * ANS-104 implictly requires a signature type ->
 * signature meta registry.
 *
 * It is not ideal that this is in code, as the registry
 * is effectively hardcoded and esoteric in this way.
 * This precedent seems to have been set with the arbundles
 * implementation
 *
 * Perhaps eventually each of these signature types
 * would be public somehwere ie. recursively defined Data Items that each implement
 * a Data-Protocol for "Data Item Signature Type", on arweave.
 */

/**
 * @enum {number}
 */
const SignatureTypes = Object.freeze({
  ARWEAVE: 1,
  ED25519: 2,
  ETHEREUM: 3,
  SOLANA: 4,
  INJECTEDAPTOS: 5,
  MULTIAPTOS: 6,
  TYPEDETHEREUM: 7,
  KYVE: 101
})

const SignatureMeta = {
  [SignatureTypes.ARWEAVE]: {
    sigLength: 512,
    pubLength: 512,
    sigName: 'arweave'
  },
  [SignatureTypes.ED25519]: {
    sigLength: 64,
    pubLength: 32,
    sigName: 'ed25519'
  },
  [SignatureTypes.ETHEREUM]: {
    sigLength: 65,
    pubLength: 65,
    sigName: 'ethereum'
  },
  [SignatureTypes.SOLANA]: {
    sigLength: 64,
    pubLength: 32,
    sigName: 'solana'
  },
  [SignatureTypes.INJECTEDAPTOS]: {
    sigLength: 64,
    pubLength: 32,
    sigName: 'injectedAptos'
  },
  [SignatureTypes.MULTIAPTOS]: {
    sigLength: 64 * 32 + 4, // max 32 64 byte signatures, +4 for 32-bit bitmap
    pubLength: 32 * 32 + 1, // max 64 32 byte keys, +1 for 8-bit threshold value
    sigName: 'multiAptos'
  },
  [SignatureTypes.TYPEDETHEREUM]: {
    sigLength: 65,
    pubLength: 42,
    sigName: 'typedEthereum'
  },
  [SignatureTypes.KYVE]: {
    sigLength: 65,
    pubLength: 65,
    sigName: 'kyve'
  }
}

if (Object.keys(SignatureTypes).length !== Object.keys(SignatureMeta).length) {
  throw new Error('Mismatch definitions between SignatureTypes and SignatureConfig')
}

/**
 * @param {SignatureTypes} type - the type of signature, according to the internal
 * registry
 * @return {SignatureMeta[keyof SignatureMeta] & { type: number }}
 */
export const lookupSignatureMeta = (type) => {
  const config = SignatureMeta[type]
  if (!config) throw new Error(`Metadata for signature type ${type} not found`)
  return { ...config, signatureType: type }
}

class AVSCTap {
  constructor (buf = Buffer.alloc(MAX_TAG_BYTES), pos = 0) {
    this.buf = buf
    this.pos = pos
  }

  writeTags (tags) {
    if (!Array.isArray(tags)) {
      throw new Error('input must be array')
    }

    const n = tags.length
    let i
    if (n) {
      this.writeLong(n)
      for (i = 0; i < n; i++) {
        // for this use case, assume tags/strings.
        const tag = tags[i]
        if (tag?.name === undefined || tag?.value === undefined) {
          throw new Error(`Invalid tag format for ${tag}, expected {name:string, value: string}`)
        }
        this.writeString(tag.name)
        this.writeString(tag.value)
        // this.itemsType._write(tap, val[i]);
      }
    }
    this.writeLong(0)
  }

  toBuffer () {
    const buffer = Buffer.alloc(this.pos)
    if (this.pos > this.buf.length) { throw new Error(`Too many tag bytes (${this.pos} > ${this.buf.length})`) }
    this.buf.copy(buffer, 0, 0, this.pos)
    return buffer
  }

  tagsExceedLimit () {
    return this.pos > this.buf.length
  }

  writeLong (n) {
    const buf = this.buf
    let f, m

    if (n >= -1073741824 && n < 1073741824) {
      // Won't overflow, we can use integer arithmetic.
      m = n >= 0 ? n << 1 : (~n << 1) | 1
      do {
        buf[this.pos] = m & 0x7f
        m >>= 7
      } while (m && (buf[this.pos++] |= 0x80))
    } else {
      // We have to use slower floating arithmetic.
      f = n >= 0 ? n * 2 : -n * 2 - 1
      do {
        buf[this.pos] = f & 0x7f
        f /= 128
      } while (f >= 1 && (buf[this.pos++] |= 0x80))
    }
    this.pos++
    this.buf = buf
  }

  writeString (s) {
    const len = Buffer.byteLength(s)
    const buf = this.buf
    this.writeLong(len)
    let pos = this.pos
    this.pos += len
    if (this.pos > buf.length) {
      return
    }
    if (len > 64) {
      // this._writeUtf8(s, len);
      this.buf.write(s, this.pos - len, len, 'utf8')
    } else {
      let i, l, c1, c2
      for (i = 0, l = len; i < l; i++) {
        c1 = s.charCodeAt(i)
        if (c1 < 0x80) {
          buf[pos++] = c1
        } else if (c1 < 0x800) {
          buf[pos++] = (c1 >> 6) | 0xc0
          buf[pos++] = (c1 & 0x3f) | 0x80
        } else if (
          (c1 & 0xfc00) === 0xd800 &&
          ((c2 = s.charCodeAt(i + 1)) & 0xfc00) === 0xdc00
        ) {
          c1 = 0x10000 + ((c1 & 0x03ff) << 10) + (c2 & 0x03ff)
          i++
          buf[pos++] = (c1 >> 18) | 0xf0
          buf[pos++] = ((c1 >> 12) & 0x3f) | 0x80
          buf[pos++] = ((c1 >> 6) & 0x3f) | 0x80
          buf[pos++] = (c1 & 0x3f) | 0x80
        } else {
          buf[pos++] = (c1 >> 12) | 0xe0
          buf[pos++] = ((c1 >> 6) & 0x3f) | 0x80
          buf[pos++] = (c1 & 0x3f) | 0x80
        }
      }
    }
    this.buf = buf
  }

  readLong () {
    let n = 0
    let k = 0
    const buf = this.buf
    let b, h, f, fk

    do {
      b = buf[this.pos++]
      h = b & 0x80
      n |= (b & 0x7f) << k
      k += 7
    } while (h && k < 28)

    if (h) {
      // Switch to float arithmetic, otherwise we might overflow.
      f = n
      fk = 268435456 // 2 ** 28.
      do {
        b = buf[this.pos++]
        f += (b & 0x7f) * fk
        fk *= 128
      } while (b & 0x80)
      return (f % 2 ? -(f + 1) : f) / 2
    }

    return (n >> 1) ^ -(n & 1)
  }

  skipLong () {
    const buf = this.buf
    // eslint-disable-next-line no-empty
    while (buf[this.pos++] & 0x80) {}
  }

  readTags () {
    // var items = this.itemsType;
    const val = []
    let n
    while ((n = this.readLong())) {
      if (n < 0) {
        n = -n
        this.skipLong() // Skip size.
      }
      while (n--) {
        const name = this.readString()
        const value = this.readString()
        val.push(/* items._read(tap) */ { name, value })
      }
    }
    return val
  }

  readString () {
    const len = this.readLong()
    const pos = this.pos
    const buf = this.buf
    this.pos += len
    if (this.pos > buf.length) {
      return undefined
    }
    return this.buf.slice(pos, pos + len).toString()
  }
}

function serializeTags (tags) {
  const tap = new AVSCTap()
  tap.writeTags(tags)
  return tap.toBuffer()
}

function longToNByteArray (N, long) {
  const byteArray = new Uint8Array(N)
  if (long < 0) { throw new Error('Array is unsigned, cannot represent -ve numbers') }
  if (long > 2 ** (N * 8) - 1) { throw new Error(`Number ${long} is too large for an array of ${N} bytes`) }
  for (let index = 0; index < byteArray.length; index++) {
    const byte = long & 0xff
    byteArray[index] = byte
    long = (long - byte) / 256
  }
  return byteArray
}

function longTo8ByteArray (long) {
  return longToNByteArray(8, long)
}

function shortTo2ByteArray (short) {
  return longToNByteArray(2, short)
}

/**
 * @typedef DataItemSignerInfo
 * @property {SignatureTypes} type
 * @property {string} publicKey
 *
 * @typedef {Object} DataItemCreateOptions
 * @property {string} [target] - Optional target value.
 * @property {string} [anchor] - Optional anchor value.
 * @property {{ name: string; value: string }[]} [tags] - Optional array of tag objects.
 *
 * @param {string | Uint8Array} data - the data to be encoded into the Data Item
 * @param {DataItemSignerInfo} signer - the signature type and corresponding publicKey as a Uint8Array
 * @param {DataItemCreateOptions} opts - named data to be encoded into the Data Item
 * @returns {Uint8Array}
 */
export function createDataItemBytes (data, signer, opts) {
  // TODO: Add asserts
  const signerMeta = lookupSignatureMeta(signer.type)
  const publicKey = signer.publicKey

  const _target = opts?.target ? base64url.toBuffer(opts.target) : null
  const target_length = 1 + (_target?.byteLength ?? 0)
  const _anchor = opts?.anchor ? Buffer.from(opts.anchor) : null
  const anchor_length = 1 + (_anchor?.byteLength ?? 0)
  const _tags = (opts?.tags?.length ?? 0) > 0 ? serializeTags(opts?.tags) : null
  const tags_length = 16 + (_tags ? _tags.byteLength : 0)
  const _data = typeof data === 'string' ? Buffer.from(data) : Buffer.from(data)
  const data_length = _data.byteLength

  const length =
    2 +
    signerMeta.sigLength +
    signerMeta.pubLength +
    target_length +
    anchor_length +
    tags_length +
    data_length
  // Create array with set length
  const bytes = Buffer.alloc(length)

  bytes.set(shortTo2ByteArray(signerMeta.signatureType), 0)
  // Push bytes for `signature`
  bytes.set(new Uint8Array(signerMeta.sigLength).fill(0), 2)

  // Push bytes for `owner`
  if (publicKey.byteLength !== signerMeta.pubLength) {
    throw new Error(`Owner must be ${signerMeta.pubLength} bytes, but was incorrectly ${publicKey.byteLength}`)
  }
  bytes.set(publicKey, 2 + signerMeta.sigLength)

  const position = 2 + signerMeta.sigLength + signerMeta.pubLength
  // Push `presence byte` and push `target` if present
  // 64 + OWNER_LENGTH
  bytes[position] = _target ? 1 : 0
  if (_target) {
    if (_target.byteLength !== 32) {
      throw new Error(`Target must be 32 bytes but was incorrectly ${_target.byteLength}`)
    }
    bytes.set(_target, position + 1)
  }

  // Push `presence byte` and push `anchor` if present
  // 64 + OWNER_LENGTH
  const anchor_start = position + target_length
  let tags_start = anchor_start + 1
  bytes[anchor_start] = _anchor ? 1 : 0
  if (_anchor) {
    tags_start += _anchor.byteLength
    if (_anchor.byteLength !== 32) throw new Error('Anchor must be 32 bytes')
    bytes.set(_anchor, anchor_start + 1)
  }

  // tags
  bytes.set(longTo8ByteArray(opts?.tags?.length ?? 0), tags_start)
  const bytesCount = longTo8ByteArray(_tags?.byteLength ?? 0)
  bytes.set(bytesCount, tags_start + 8)
  if (_tags) {
    bytes.set(_tags, tags_start + 16)
  }

  // data
  const data_start = tags_start + tags_length
  bytes.set(_data, data_start)

  return bytes
}
