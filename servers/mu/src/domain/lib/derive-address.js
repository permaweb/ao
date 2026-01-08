import createKeccakHash from 'keccak'
import { Point } from '@noble/secp256k1'
import bs58 from 'bs58'

/**
 * Derive Ethereum address from secp256k1 public key (compressed or uncompressed)
 * Follows EIP-55 checksum standard
 *
 * @param {string} keyBase64Url - Base64URL-encoded public key (33 or 65 bytes)
 * @returns {string} Ethereum address with EIP-55 checksum (0x...)
 */
export function deriveEthereumAddress (keyBase64Url) {
  const keyBytes = Buffer.from(keyBase64Url, 'base64url')

  // Decompress if needed (33-byte compressed → 65-byte uncompressed)
  let uncompressed
  if (keyBytes.length === 65) {
    // Already uncompressed (0x04 prefix + 64 bytes)
    if (keyBytes[0] !== 0x04) {
      throw new Error('Invalid uncompressed public key: expected 0x04 prefix')
    }
    uncompressed = keyBytes
  } else if (keyBytes.length === 33) {
    // Compressed key (0x02 or 0x03 prefix + 32 bytes)
    if (keyBytes[0] !== 0x02 && keyBytes[0] !== 0x03) {
      throw new Error('Invalid compressed public key: expected 0x02 or 0x03 prefix')
    }
    const point = Point.fromHex(keyBytes)
    uncompressed = Buffer.from(point.toRawBytes(false)) // false = uncompressed
  } else {
    throw new Error(`Invalid ECDSA public key length: ${keyBytes.length}. Expected 33 or 65 bytes.`)
  }

  // Hash the 64 bytes after the 0x04 prefix
  const address = createKeccakHash('keccak256')
    .update(uncompressed.slice(1))
    .digest('hex')
    .slice(-40) // Last 20 bytes

  // Apply EIP-55 checksum
  const hash = createKeccakHash('keccak256')
    .update(address)
    .digest('hex')

  let checksumAddress = '0x'
  for (let i = 0; i < address.length; i++) {
    checksumAddress += parseInt(hash[i], 16) >= 8
      ? address[i].toUpperCase()
      : address[i]
  }

  return checksumAddress
}

/**
 * Derive Solana address from Ed25519 public key (base58 encoding)
 *
 * @param {string} keyBase64Url - Base64URL-encoded public key (32 bytes)
 * @returns {string} Solana address (base58-encoded)
 */
export function deriveSolanaAddress (keyBase64Url) {
  const keyBytes = Buffer.from(keyBase64Url, 'base64url')
  if (keyBytes.length !== 32) {
    throw new Error(`Invalid Ed25519 public key length: ${keyBytes.length}. Expected 32 bytes.`)
  }
  return bs58.encode(keyBytes)
}

/**
 * Detect signature type by base64url-encoded signature length
 *
 * @param {string} signatureBase64Url - Base64URL-encoded signature
 * @returns {'ethereum' | 'solana' | 'arweave' | 'unknown'}
 */
export function detectSignatureType (signatureBase64Url) {
  const len = signatureBase64Url.length

  // ECDSA (secp256k1) signature: 65 bytes → 87 chars base64url
  if (len === 87) return 'ethereum'

  // Ed25519 signature: 64 bytes → 86 chars base64url
  if (len === 86) return 'solana'

  // Arweave RSA signature: 512 bytes → 683 chars base64url
  if (len === 683) return 'arweave'

  return 'unknown'
}

/**
 * Detect key type by base64url-encoded public key length
 *
 * @param {string} keyBase64Url - Base64URL-encoded public key
 * @returns {'ethereum' | 'solana' | 'arweave' | 'unknown'}
 */
export function detectKeyType (keyBase64Url) {
  const keyBytes = Buffer.from(keyBase64Url, 'base64url')
  const len = keyBytes.length

  // Ethereum secp256k1: 33 bytes (compressed) or 65 bytes (uncompressed)
  if (len === 33 || len === 65) return 'ethereum'

  // Solana Ed25519: 32 bytes
  if (len === 32) return 'solana'

  // Arweave RSA: 512 bytes (n value of modulus)
  if (len === 512) return 'arweave'

  return 'unknown'
}
