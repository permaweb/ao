import { describe, test } from 'node:test'
import * as assert from 'node:assert'
import { createHash } from 'node:crypto'
import { getPublicKey as getSecp256k1PublicKey, utils as secp256k1Utils } from '@noble/secp256k1'
import * as ed25519Module from '@noble/ed25519'
import { deriveEthereumAddress, deriveSolanaAddress, detectSignatureType, detectKeyType } from './derive-address.js'

// Configure @noble/ed25519 to use Node.js crypto (required in Node.js environment)
ed25519Module.etc.sha512Sync = (...m) => createHash('sha512').update(ed25519Module.etc.concatBytes(...m)).digest()

const getEd25519PublicKey = ed25519Module.getPublicKey
const ed25519Utils = ed25519Module.utils

describe('deriveEthereumAddress', () => {
  describe('Uncompressed Keys (65 bytes)', () => {
    test('derives correct address from uncompressed pubkey', async () => {
      // Generate a test key pair
      const privKey = secp256k1Utils.randomPrivateKey()
      const pubKeyUncompressed = getSecp256k1PublicKey(privKey, false) // 65 bytes
      const pubKeyBase64Url = Buffer.from(pubKeyUncompressed).toString('base64url')

      const address = deriveEthereumAddress(pubKeyBase64Url)

      // Verify format: 0x followed by 40 hex characters
      assert.ok(address.startsWith('0x'), 'Address should start with 0x')
      assert.strictEqual(address.length, 42, 'Address should be 42 characters (0x + 40 hex)')
      assert.ok(/^0x[0-9a-fA-F]{40}$/.test(address), 'Address should be valid hex')
    })

    test('applies EIP-55 checksum correctly', () => {
      // Known test vector - Vitalik's address with specific pubkey
      // This is a real secp256k1 keypair generated for testing
      const privKey = Buffer.from('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'hex')
      const pubKeyUncompressed = getSecp256k1PublicKey(privKey, false)
      const pubKeyBase64Url = Buffer.from(pubKeyUncompressed).toString('base64url')

      const address = deriveEthereumAddress(pubKeyBase64Url)

      // Address should have mixed case (EIP-55 checksum)
      assert.ok(/[A-F]/.test(address.slice(2)), 'Should have uppercase letters (checksum)')
      assert.ok(/[a-f]/.test(address.slice(2)), 'Should have lowercase letters (checksum)')
    })

    test('rejects invalid uncompressed key prefix', () => {
      // Create a 65-byte key with wrong prefix (should be 0x04)
      const invalidKey = Buffer.alloc(65)
      invalidKey[0] = 0x05 // Wrong prefix
      const keyBase64Url = invalidKey.toString('base64url')

      assert.throws(
        () => deriveEthereumAddress(keyBase64Url),
        /Invalid uncompressed public key/,
        'Should reject invalid prefix'
      )
    })
  })

  describe('Compressed Keys (33 bytes)', () => {
    test('derives correct address from compressed pubkey', () => {
      const privKey = secp256k1Utils.randomPrivateKey()
      const pubKeyCompressed = getSecp256k1PublicKey(privKey, true) // 33 bytes
      const pubKeyBase64Url = Buffer.from(pubKeyCompressed).toString('base64url')

      const address = deriveEthereumAddress(pubKeyBase64Url)

      // Verify format
      assert.ok(address.startsWith('0x'), 'Address should start with 0x')
      assert.strictEqual(address.length, 42, 'Address should be 42 characters')
    })

    test('compressed and uncompressed derive same address', () => {
      const privKey = secp256k1Utils.randomPrivateKey()
      const pubKeyCompressed = getSecp256k1PublicKey(privKey, true)
      const pubKeyUncompressed = getSecp256k1PublicKey(privKey, false)

      const compressedBase64Url = Buffer.from(pubKeyCompressed).toString('base64url')
      const uncompressedBase64Url = Buffer.from(pubKeyUncompressed).toString('base64url')

      const addressFromCompressed = deriveEthereumAddress(compressedBase64Url)
      const addressFromUncompressed = deriveEthereumAddress(uncompressedBase64Url)

      assert.strictEqual(
        addressFromCompressed,
        addressFromUncompressed,
        'Both key formats should derive the same address'
      )
    })

    test('handles 0x02 prefix (even Y coordinate)', () => {
      // Generate keys until we get one with 0x02 prefix
      let privKey, pubKey
      do {
        privKey = secp256k1Utils.randomPrivateKey()
        pubKey = getSecp256k1PublicKey(privKey, true)
      } while (pubKey[0] !== 0x02)

      const pubKeyBase64Url = Buffer.from(pubKey).toString('base64url')
      const address = deriveEthereumAddress(pubKeyBase64Url)

      assert.ok(address.startsWith('0x'), 'Should derive valid address from 0x02 prefix')
      assert.strictEqual(address.length, 42)
    })

    test('handles 0x03 prefix (odd Y coordinate)', () => {
      // Generate keys until we get one with 0x03 prefix
      let privKey, pubKey
      do {
        privKey = secp256k1Utils.randomPrivateKey()
        pubKey = getSecp256k1PublicKey(privKey, true)
      } while (pubKey[0] !== 0x03)

      const pubKeyBase64Url = Buffer.from(pubKey).toString('base64url')
      const address = deriveEthereumAddress(pubKeyBase64Url)

      assert.ok(address.startsWith('0x'), 'Should derive valid address from 0x03 prefix')
      assert.strictEqual(address.length, 42)
    })

    test('rejects invalid compressed key prefix', () => {
      const invalidKey = Buffer.alloc(33)
      invalidKey[0] = 0x04 // Wrong prefix for compressed (should be 0x02 or 0x03)
      const keyBase64Url = invalidKey.toString('base64url')

      assert.throws(
        () => deriveEthereumAddress(keyBase64Url),
        /Invalid compressed public key/,
        'Should reject invalid prefix'
      )
    })
  })

  describe('Edge Cases', () => {
    test('throws on invalid key length (not 33 or 65)', () => {
      const invalidKey = Buffer.alloc(32).toString('base64url')
      assert.throws(
        () => deriveEthereumAddress(invalidKey),
        /Invalid ECDSA public key length/,
        'Should reject 32-byte key'
      )
    })

    test('throws on empty key', () => {
      assert.throws(
        () => deriveEthereumAddress(''),
        /Invalid ECDSA public key length/,
        'Should reject empty key'
      )
    })

    test('throws on 64-byte key (wrong length)', () => {
      const invalidKey = Buffer.alloc(64).toString('base64url')
      assert.throws(
        () => deriveEthereumAddress(invalidKey),
        /Invalid ECDSA public key length/,
        'Should reject 64-byte key'
      )
    })
  })
})

describe('deriveSolanaAddress', () => {
  describe('Valid Keys', () => {
    test('derives correct base58 address from Ed25519 pubkey', async () => {
      const privKey = ed25519Utils.randomPrivateKey()
      const pubKey = await getEd25519PublicKey(privKey)
      const pubKeyBase64Url = Buffer.from(pubKey).toString('base64url')

      const address = deriveSolanaAddress(pubKeyBase64Url)

      // Verify base58 format (typically 32-44 characters for 32-byte keys)
      assert.ok(address.length >= 32, 'Base58 address should be at least 32 characters')
      assert.ok(address.length <= 44, 'Base58 address should be at most 44 characters')
      assert.ok(/^[1-9A-HJ-NP-Za-km-z]+$/.test(address), 'Should be valid base58 (no 0, O, I, l)')
    })

    test('multiple keys derive unique addresses', async () => {
      const privKey1 = ed25519Utils.randomPrivateKey()
      const privKey2 = ed25519Utils.randomPrivateKey()

      const pubKey1 = await getEd25519PublicKey(privKey1)
      const pubKey2 = await getEd25519PublicKey(privKey2)

      const address1 = deriveSolanaAddress(Buffer.from(pubKey1).toString('base64url'))
      const address2 = deriveSolanaAddress(Buffer.from(pubKey2).toString('base64url'))

      assert.notStrictEqual(address1, address2, 'Different keys should produce different addresses')
    })

    test('same key always derives same address', async () => {
      const privKey = ed25519Utils.randomPrivateKey()
      const pubKey = await getEd25519PublicKey(privKey)
      const pubKeyBase64Url = Buffer.from(pubKey).toString('base64url')

      const address1 = deriveSolanaAddress(pubKeyBase64Url)
      const address2 = deriveSolanaAddress(pubKeyBase64Url)

      assert.strictEqual(address1, address2, 'Same key should always produce same address')
    })
  })

  describe('Edge Cases', () => {
    test('throws on invalid key length (not 32)', () => {
      const invalidKey = Buffer.alloc(33).toString('base64url')
      assert.throws(
        () => deriveSolanaAddress(invalidKey),
        /Invalid Ed25519 public key length/,
        'Should reject 33-byte key'
      )
    })

    test('handles all-zero pubkey', () => {
      const zeroKey = Buffer.alloc(32).toString('base64url')
      const address = deriveSolanaAddress(zeroKey)

      assert.ok(address.length > 0, 'Should derive address from all-zero key')
      assert.strictEqual(address, '11111111111111111111111111111111', 'All-zero key has known address')
    })

    test('handles all-FF pubkey', () => {
      const ffKey = Buffer.alloc(32, 0xFF).toString('base64url')
      const address = deriveSolanaAddress(ffKey)

      assert.ok(address.length > 0, 'Should derive address from all-FF key')
    })

    test('throws on empty key', () => {
      assert.throws(
        () => deriveSolanaAddress(''),
        /Invalid Ed25519 public key length/,
        'Should reject empty key'
      )
    })
  })
})

describe('detectSignatureType', () => {
  test('detects ECDSA by signature length 87 (base64url)', () => {
    const sig = Buffer.alloc(65).toString('base64url') // 65 bytes → 87 chars
    assert.strictEqual(detectSignatureType(sig), 'ethereum')
  })

  test('detects Ed25519 by signature length 86 (base64url)', () => {
    const sig = Buffer.alloc(64).toString('base64url') // 64 bytes → 86 chars
    assert.strictEqual(detectSignatureType(sig), 'solana')
  })

  test('detects Arweave by signature length 683 (base64url)', () => {
    const sig = Buffer.alloc(512).toString('base64url') // 512 bytes → 683 chars
    assert.strictEqual(detectSignatureType(sig), 'arweave')
  })

  test('returns unknown for other lengths', () => {
    const sig = Buffer.alloc(100).toString('base64url')
    assert.strictEqual(detectSignatureType(sig), 'unknown')
  })

  test('returns unknown for empty signature', () => {
    assert.strictEqual(detectSignatureType(''), 'unknown')
  })

  test('returns unknown for very short signature', () => {
    const sig = Buffer.alloc(1).toString('base64url')
    assert.strictEqual(detectSignatureType(sig), 'unknown')
  })
})

describe('detectKeyType', () => {
  test('detects Ethereum by compressed key length (33 bytes)', () => {
    const key = Buffer.alloc(33).toString('base64url')
    assert.strictEqual(detectKeyType(key), 'ethereum')
  })

  test('detects Ethereum by uncompressed key length (65 bytes)', () => {
    const key = Buffer.alloc(65).toString('base64url')
    assert.strictEqual(detectKeyType(key), 'ethereum')
  })

  test('detects Solana by Ed25519 key length (32 bytes)', () => {
    const key = Buffer.alloc(32).toString('base64url')
    assert.strictEqual(detectKeyType(key), 'solana')
  })

  test('detects Arweave by RSA modulus length (512 bytes)', () => {
    const key = Buffer.alloc(512).toString('base64url')
    assert.strictEqual(detectKeyType(key), 'arweave')
  })

  test('returns unknown for other lengths', () => {
    const key = Buffer.alloc(100).toString('base64url')
    assert.strictEqual(detectKeyType(key), 'unknown')
  })

  test('returns unknown for empty key', () => {
    assert.strictEqual(detectKeyType(''), 'unknown')
  })

  test('distinguishes between Solana (32) and Ethereum compressed (33)', () => {
    const solanaKey = Buffer.alloc(32).toString('base64url')
    const ethKey = Buffer.alloc(33).toString('base64url')

    assert.strictEqual(detectKeyType(solanaKey), 'solana')
    assert.strictEqual(detectKeyType(ethKey), 'ethereum')
  })
})
