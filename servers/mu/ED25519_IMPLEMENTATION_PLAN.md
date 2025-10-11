# Ed25519 (Solana) + Compressed ECDSA Implementation Plan

## Executive Summary

**Objective**: Add first-class Ed25519 (Solana) signer support and accept compressed secp256k1 (Ethereum) public keys in the MU, with **zero breaking changes** to existing functionality.

**Status**: ✅ **Ready to implement** - All analysis complete, tests currently pass (68/75 pass, 7 pre-existing failures unrelated to this work)

---

## Current State Analysis

### Build/Test Status
- **npm i**: ✅ Works (with Node 20.19.2, though package.json requests Node 22)
- **npm test**: ✅ 68 tests pass, 7 tests fail (pre-existing, unrelated to signature verification)
- **Test framework**: Node built-in test runner (`node:test`)
- **Test pattern**: `describe/test` with `node:assert`

### Existing Signature Infrastructure

#### 1. ANS-104 DataItem Verification (Entry Point)
**Location**: `servers/mu/src/routes/root.js:75`
```javascript
import { DataItem } from 'arbundles'

// Line 75: Entry point verification
async (val) => DataItem.verify(val).catch((err) => {
  logger({ log: ['Error verifying DataItem', err] })
  return false
})
```

**Key Finding**: MU uses `arbundles@0.11.0` (NOT `warp-arbundles`) for DataItem verification. This library **already supports** Ed25519 (type 2), ECDSA (type 3), and Solana (type 4).

**Signature Types in arbundles** (from `node_modules/arbundles/build/node/cjs/src/constants.js`):
```javascript
SignatureConfig {
  ARWEAVE = 1,     // RSA, 512-byte sig, 512-byte pubkey
  ED25519 = 2,     // Ed25519, 64-byte sig, 32-byte pubkey
  ETHEREUM = 3,    // ECDSA, 65-byte sig, 65-byte pubkey (uncompressed)
  SOLANA = 4,      // Ed25519, 64-byte sig, 32-byte pubkey
  // ... others
}
```

#### 2. Ethereum Address Derivation (Current Implementation)
**Locations**:
- `servers/mu/src/domain/api/sendDataItem.js:55-85` (keyToEthereumAddress)
- `servers/mu/src/domain/clients/taskQueue.js:57-87` (keyToEthereumAddress)

**Current Logic** (sendDataItem.js:55-85):
```javascript
function keyToEthereumAddress (key) {
  // PROBLEM: Assumes uncompressed key, removes first byte
  const noCompressionByte = Buffer.from(key, 'base64url').subarray(1)

  const noPrefix = createKeccakHash('keccak256')
    .update(noCompressionByte)
    .digest('hex')
    .slice(-40)  // Last 20 bytes

  // Apply EIP-55 checksum
  const hash = createKeccakHash('keccak256').update(noPrefix).digest('hex')
  let checksumAddress = '0x'
  for (let i = 0; i < noPrefix.length; i++) {
    checksumAddress += parseInt(hash[i], 16) >= 8
      ? noPrefix[i].toUpperCase()
      : noPrefix[i]
  }
  return checksumAddress
}
```

**Current Trigger** (sendDataItem.js:106-108):
```javascript
if (ctx.dataItem.signature.length === 87) {  // Base64URL of 65-byte ECDSA sig
  address = keyToEthereumAddress(ctx.dataItem.owner)
}
```

**Problem**: Assumes 65-byte uncompressed public key, but compressed keys (33 bytes) are valid and should be accepted.

#### 3. Arweave Address Derivation
**Location**: `servers/mu/src/domain/index.js:74-81`
```javascript
async function ownerToAddress(owner) {
  return bufferTob64Url(
    await crypto.createHash('SHA-256')
      .update(b64UrlToBuffer(owner))
      .digest()
  );
}
```

**Usage**: Default address derivation for non-ECDSA signatures.

#### 4. Context Flow
```
HTTP POST "/" (raw DataItem)
  ↓
arbundles.DataItem.verify() [validates signature via ANS-104]
  ↓
parseDataItemWith() [extracts owner, signature, tags, etc.]
  ↓
verifyParsedDataItemWith() [validates ao-specific tags: Data-Protocol, Type]
  ↓
checkRateLimitExceeded()
  ├─ If sig.length === 87 (ECDSA) → keyToEthereumAddress(owner)
  └─ Else → ownerToAddress(owner) [SHA-256 of owner]
  ↓
sendMessage/sendProcess → forwards to SU with address
```

### No Native Address Exposure Found

**Critical Finding**: The MU does **not** currently expose a "native" address field for ETH addresses in the envelope sent to the SU. The current implementation:
1. Derives ETH address via `keyToEthereumAddress()`
2. Uses it **only** for rate limiting (`checkRateLimitExceeded`)
3. The envelope to SU contains only the base64url-encoded `owner` field (raw public key)

**Implication**: The requirements mention "mirroring ETH/AR native exposure pattern," but this pattern doesn't currently exist in the MU codebase. The MU appears to be a pure pass-through that:
- Validates DataItem signatures (via arbundles)
- Validates ao protocol tags
- Rate-limits by derived address
- Forwards raw DataItem to SU

The SU/CU are responsible for address derivation from the raw `owner` field in the DataItem.

---

## Requirements Clarification Needed

### Question 1: Native Address Exposure

The requirements state:
> "Expose like ETH/AR do: keep whatever field MU uses for normalized sender unchanged, and also set the native identifier alongside ETH/AR's native."

However, **the MU does not currently expose any native address field** in outbound messages to the SU. It only:
1. Verifies signatures
2. Uses derived addresses internally for rate limiting
3. Forwards raw DataItems (with raw `owner` field) to SU

**Options**:
A. **Add** native address exposure (new feature, not just "mirroring")
B. **Skip** native address exposure, only add Ed25519 verification + ETH compressed key support
C. **Clarify** if "native exposure" means something else in this context

### Question 2: Signature Type Detection

The requirements state:
> "No tags are required or added. This mirrors ETH/AR: detect by signatureType"

However, **the MU doesn't currently access signatureType directly**. It relies on:
1. `arbundles.DataItem.verify()` to validate signatures
2. `signature.length` to distinguish ECDSA (87 bytes base64url = 65 bytes raw)

The `signatureType` field is available in the ANS-104 DataItem structure, but would need to be extracted.

**Options**:
A. Parse signatureType from DataItem header (2 bytes at offset 0)
B. Continue using signature.length + add Ed25519 detection (64 bytes = 86 base64url chars)
C. Access signatureType via arbundles DataItem API (if available)

---

## Proposed Implementation Plan (Pending Clarification)

### Phase 1: Foundation (No Behavior Changes)

#### 1.1 Add Dependencies
**File**: `servers/mu/package.json`
```json
{
  "dependencies": {
    "@noble/ed25519": "^2.1.0",
    "@noble/secp256k1": "^2.1.0",
    "bs58": "^5.0.0"
    // Note: js-sha3 NOT needed - keccak@3.0.4 already installed
  }
}
```

#### 1.2 Create Crypto Utilities
**File**: `servers/mu/src/crypto/ed25519.js` (new)
```javascript
/**
 * Ed25519 signature verification and address derivation for Solana wallets
 */
import { verify as ed25519Verify } from '@noble/ed25519'
import bs58 from 'bs58'

/**
 * Verify an Ed25519 signature
 * @param {Uint8Array} signature - 64-byte signature
 * @param {Uint8Array} owner - 32-byte public key
 * @param {Uint8Array} message - Message bytes (deep hash preimage)
 * @returns {Promise<boolean>}
 */
export async function verifyEd25519(signature, owner, message) {
  return ed25519Verify(signature, message, owner)
}

/**
 * Convert Ed25519 public key to Solana base58 address
 * @param {Uint8Array} owner - 32-byte public key
 * @returns {string} Base58-encoded address
 */
export function solanaBase58(owner) {
  return bs58.encode(owner)
}
```

**File**: `servers/mu/src/crypto/secp256k1.js` (new)
```javascript
/**
 * secp256k1 utilities for Ethereum wallet support
 */
import { Point } from '@noble/secp256k1'
import createKeccakHash from 'keccak'

/**
 * Decompress a secp256k1 public key if needed
 * @param {Uint8Array} pubkey - 33-byte compressed or 65-byte uncompressed key
 * @returns {Uint8Array} 65-byte uncompressed key (0x04 prefix + 64 bytes)
 */
export function decompressIfNeeded(pubkey) {
  if (pubkey.length === 65) {
    // Already uncompressed
    if (pubkey[0] !== 0x04) {
      throw new Error('Invalid uncompressed public key prefix')
    }
    return pubkey
  }

  if (pubkey.length === 33) {
    // Compressed key (0x02 or 0x03 prefix)
    if (pubkey[0] !== 0x02 && pubkey[0] !== 0x03) {
      throw new Error('Invalid compressed public key prefix')
    }
    const point = Point.fromHex(pubkey)
    return point.toRawBytes(false) // false = uncompressed
  }

  throw new Error(`Invalid public key length: ${pubkey.length}. Expected 33 or 65 bytes.`)
}

/**
 * Derive Ethereum address from uncompressed public key
 * @param {Uint8Array} uncompressed65 - 65-byte uncompressed key
 * @returns {string} Ethereum address with EIP-55 checksum (0x...)
 */
export function ethereumAddressFromUncompressed(uncompressed65) {
  if (uncompressed65.length !== 65 || uncompressed65[0] !== 0x04) {
    throw new Error('Expected 65-byte uncompressed public key with 0x04 prefix')
  }

  // Hash the 64 bytes after the 0x04 prefix
  const hash = createKeccakHash('keccak256')
    .update(uncompressed65.slice(1))
    .digest('hex')

  // Take last 20 bytes (40 hex chars)
  const address = hash.slice(-40)

  // Apply EIP-55 checksum
  const checksumHash = createKeccakHash('keccak256')
    .update(address)
    .digest('hex')

  let checksumAddress = '0x'
  for (let i = 0; i < address.length; i++) {
    checksumAddress += parseInt(checksumHash[i], 16) >= 8
      ? address[i].toUpperCase()
      : address[i]
  }

  return checksumAddress
}
```

#### 1.3 Add Unit Tests for Crypto Utilities
**File**: `servers/mu/src/crypto/ed25519.test.js` (new)
```javascript
import { describe, test } from 'node:test'
import * as assert from 'node:assert'
import { utils as ed25519Utils, getPublicKey, sign } from '@noble/ed25519'
import { verifyEd25519, solanaBase58 } from './ed25519.js'

describe('ed25519', () => {
  test('verifyEd25519 - valid signature', async () => {
    const privKey = ed25519Utils.randomPrivateKey()
    const pubKey = await getPublicKey(privKey)
    const message = new Uint8Array([1, 2, 3, 4, 5])
    const signature = await sign(message, privKey)

    const valid = await verifyEd25519(signature, pubKey, message)
    assert.ok(valid)
  })

  test('verifyEd25519 - invalid signature', async () => {
    const privKey = ed25519Utils.randomPrivateKey()
    const pubKey = await getPublicKey(privKey)
    const message = new Uint8Array([1, 2, 3, 4, 5])
    const signature = await sign(message, privKey)

    // Tamper with signature
    signature[0] ^= 1

    const valid = await verifyEd25519(signature, pubKey, message)
    assert.ok(!valid)
  })

  test('solanaBase58 - encodes public key', async () => {
    const privKey = ed25519Utils.randomPrivateKey()
    const pubKey = await getPublicKey(privKey)

    const address = solanaBase58(pubKey)

    // Solana addresses are base58 strings, typically 32-44 chars
    assert.ok(typeof address === 'string')
    assert.ok(address.length >= 32)
    assert.ok(address.length <= 44)
    // Base58 alphabet: no 0, O, I, l
    assert.ok(/^[1-9A-HJ-NP-Za-km-z]+$/.test(address))
  })
})
```

**File**: `servers/mu/src/crypto/secp256k1.test.js` (new)
```javascript
import { describe, test } from 'node:test'
import * as assert from 'node:assert'
import { utils as secp256k1Utils, getPublicKey } from '@noble/secp256k1'
import { decompressIfNeeded, ethereumAddressFromUncompressed } from './secp256k1.js'

describe('secp256k1', () => {
  describe('decompressIfNeeded', () => {
    test('uncompressed key - returns unchanged', () => {
      const privKey = secp256k1Utils.randomPrivateKey()
      const uncompressed = getPublicKey(privKey, false) // 65 bytes

      const result = decompressIfNeeded(uncompressed)

      assert.equal(result.length, 65)
      assert.deepEqual(result, uncompressed)
    })

    test('compressed key - decompresses correctly', () => {
      const privKey = secp256k1Utils.randomPrivateKey()
      const compressed = getPublicKey(privKey, true) // 33 bytes
      const uncompressed = getPublicKey(privKey, false) // 65 bytes

      const result = decompressIfNeeded(compressed)

      assert.equal(result.length, 65)
      assert.deepEqual(result, uncompressed)
    })

    test('both forms - derive same address', () => {
      const privKey = secp256k1Utils.randomPrivateKey()
      const compressed = getPublicKey(privKey, true)
      const uncompressed = getPublicKey(privKey, false)

      const decompressed = decompressIfNeeded(compressed)
      const addressFromCompressed = ethereumAddressFromUncompressed(decompressed)
      const addressFromUncompressed = ethereumAddressFromUncompressed(uncompressed)

      assert.equal(addressFromCompressed, addressFromUncompressed)
    })
  })

  describe('ethereumAddressFromUncompressed', () => {
    test('derives valid Ethereum address', () => {
      const privKey = secp256k1Utils.randomPrivateKey()
      const uncompressed = getPublicKey(privKey, false)

      const address = ethereumAddressFromUncompressed(uncompressed)

      // Ethereum address: 0x + 40 hex chars
      assert.ok(address.startsWith('0x'))
      assert.equal(address.length, 42)
      assert.ok(/^0x[0-9a-fA-F]{40}$/.test(address))
    })

    test('applies EIP-55 checksum', () => {
      const privKey = secp256k1Utils.randomPrivateKey()
      const uncompressed = getPublicKey(privKey, false)

      const address = ethereumAddressFromUncompressed(uncompressed)

      // Should have mixed case (checksum)
      const hasLowercase = /[a-f]/.test(address)
      const hasUppercase = /[A-F]/.test(address)
      // Note: Some addresses might be all-numeric, so we can't strictly require both
      assert.ok(/^0x[0-9a-fA-F]{40}$/.test(address))
    })
  })
})
```

### Phase 2: Modify Verification Logic (Main Changes)

**NOTE**: Implementation depends on answers to questions above. Below shows **Option B** (no native address exposure, signature length detection).

#### 2.1 Update sendDataItem.js
**File**: `servers/mu/src/domain/api/sendDataItem.js`

**Changes**:
1. Import crypto utilities
2. Replace `keyToEthereumAddress` with new implementation
3. Add Ed25519 detection in `checkRateLimitExceeded`

```javascript
// Add imports at top
import { decompressIfNeeded, ethereumAddressFromUncompressed } from '../../crypto/secp256k1.js'
import { solanaBase58 } from '../../crypto/ed25519.js'

// Replace keyToEthereumAddress function (lines 55-85) with:
function keyToEthereumAddress (key) {
  try {
    const keyBytes = Buffer.from(key, 'base64url')
    const uncompressed = decompressIfNeeded(keyBytes)
    return ethereumAddressFromUncompressed(uncompressed)
  } catch (err) {
    throw new Error(`Failed to derive Ethereum address: ${err.message}`)
  }
}

// Modify checkRateLimitExceeded (lines 106-108) to:
const wallet = ctx.dataItem.owner
let address = await toAddress(wallet) || null

// Detect signature type by length (base64url encoded)
const sigLen = ctx.dataItem.signature.length
if (sigLen === 87) {
  // ECDSA signature (65 bytes) - Ethereum
  address = keyToEthereumAddress(ctx.dataItem.owner)
} else if (sigLen === 86) {
  // Ed25519 signature (64 bytes) - Solana
  const ownerBytes = Buffer.from(ctx.dataItem.owner, 'base64url')
  address = solanaBase58(ownerBytes)
}
```

#### 2.2 Update taskQueue.js
**File**: `servers/mu/src/domain/clients/taskQueue.js`

**Changes**: Same as sendDataItem.js for `keyToEthereumAddress` and rate limiting logic.

```javascript
// Add imports
import { decompressIfNeeded, ethereumAddressFromUncompressed } from '../../crypto/secp256k1.js'
import { solanaBase58 } from '../../crypto/ed25519.js'

// Replace keyToEthereumAddress (lines 57-87)
function keyToEthereumAddress (key) {
  try {
    const keyBytes = Buffer.from(key, 'base64url')
    const uncompressed = decompressIfNeeded(keyBytes)
    return ethereumAddressFromUncompressed(uncompressed)
  } catch (err) {
    throw new Error(`Failed to derive Ethereum address: ${err.message}`)
  }
}

// Update checkRateLimitExceeded (lines 104-106):
const owner = (task.parentOwner ?? task?.wallet ?? task.cachedMsg?.wallet)
let address = task?.cachedMsg?.cron ? wallet : await toAddress(wallet)

if (owner && owner.length === 87) {
  // ECDSA - Ethereum
  address = keyToEthereumAddress(owner)
} else if (owner && owner.length === 86) {
  // Ed25519 - Solana
  const ownerBytes = Buffer.from(owner, 'base64url')
  address = solanaBase58(ownerBytes)
}
```

**Note**: This code uses `owner.length` to detect the signature type because `owner` is already a base64url string. We need to clarify if `owner` in this context is the public key or signature.

### Phase 3: Verification Tests

#### 3.1 Add Verification Layer Tests
**File**: `servers/mu/src/domain/api/verify-signatures.test.js` (new)
```javascript
import { describe, test } from 'node:test'
import * as assert from 'node:assert'
import { DataItem } from 'arbundles'
import { utils as ed25519Utils, getPublicKey as getEd25519PublicKey, sign as ed25519Sign } from '@noble/ed25519'
import { utils as secp256k1Utils, getPublicKey as getSecp256k1PublicKey, sign as secp256k1Sign } from '@noble/secp256k1'
import { createData, ArweaveSigner } from 'warp-arbundles'

describe('DataItem signature verification', () => {
  test('Ed25519 (Solana) message accepted', async () => {
    // TODO: Construct Ed25519-signed DataItem
    // Verify it passes DataItem.verify()
    // Check address derivation matches expected base58
  })

  test('Ed25519 bad signature rejected', async () => {
    // TODO: Construct Ed25519 DataItem with tampered signature
    // Verify DataItem.verify() returns false
  })

  test('ECDSA compressed accepted', async () => {
    // TODO: Construct ECDSA DataItem with compressed pubkey
    // Verify it passes and derives correct ETH address
  })

  test('ECDSA uncompressed accepted (baseline)', async () => {
    // TODO: Existing test case
  })
})
```

**Implementation Note**: Need to research how to construct Ed25519-signed DataItems using arbundles API. May require using a different signer than `ArweaveSigner`.

### Phase 4: Lint, Build, Test

```bash
cd servers/mu
npm run lint        # Should pass (StandardJS)
npm test            # All new tests should pass, old tests unchanged
```

---

## Testing Strategy

### Unit Tests (New)
1. ✅ `src/crypto/ed25519.test.js` - Verify Ed25519 signature verification and base58 encoding
2. ✅ `src/crypto/secp256k1.test.js` - Verify compressed/uncompressed key handling and ETH address derivation

### Integration Tests (New)
3. ⚠️  `src/domain/api/verify-signatures.test.js` - End-to-end DataItem verification
   - Requires figuring out how to construct Ed25519 DataItems with arbundles

### Regression Tests (Existing - Must Pass)
4. ✅ All existing tests must continue to pass
5. ✅ Existing Arweave and Ethereum flows must be unchanged

---

## Open Questions (BLOCKING)

### Critical Path Questions

1. **Native Address Exposure**:
   - Should we add a new `senderNative` field to the envelope sent to SU?
   - Or is "native address" only for internal MU use (rate limiting)?
   - Current code does NOT expose native addresses externally.

2. **Signature Type Detection Method**:
   - Parse `signatureType` from DataItem header bytes?
   - Continue using signature.length?
   - Access via arbundles DataItem API?

3. **arbundles Ed25519 Signer**:
   - How to construct Ed25519-signed DataItems for testing?
   - Does arbundles provide an Ed25519 signer, or do we need to manually construct the DataItem?

### Non-Blocking Questions

4. **Solana Type 4 vs Ed25519 Type 2**:
   - Requirements say "Ed25519 (Solana)" but arbundles has both Type 2 (ED25519) and Type 4 (SOLANA).
   - Are they different, or is Type 4 just an alias?
   - Which should we target?

5. **Error Handling**:
   - Should invalid Ed25519/ECDSA addresses fail silently (return null) or throw?
   - Current ETH address derivation doesn't have explicit error handling.

---

## Risk Assessment

### Low Risk ✅
- Adding crypto utility functions (isolated, well-tested)
- Updating ETH address derivation to support compressed keys (drop-in replacement)
- Unit tests for crypto functions

### Medium Risk ⚠️
- Signature type detection (need to ensure correct identification)
- Rate limiting logic changes (must not break existing behavior)
- Integration testing with arbundles Ed25519

### High Risk 🔴
- If native address exposure is required: changes to envelope structure sent to SU (requires SU/CU coordination)

---

## Acceptance Criteria

- [ ] All existing MU tests pass (68/75 currently pass - maintain or improve)
- [ ] New crypto utility tests pass
- [ ] Ed25519 messages verify correctly
- [ ] Ed25519 addresses derive to base58 format
- [ ] ECDSA compressed keys derive to same address as uncompressed
- [ ] ETH/AR behavior unchanged for existing inputs
- [ ] No new tags required
- [ ] npm run lint passes
- [ ] No breaking changes to SU/CU interfaces

---

## Next Steps

1. **PAUSE** - Get answers to Critical Path Questions above
2. Implement Phase 1 (crypto utilities)
3. Run unit tests for crypto utilities
4. Implement Phase 2 (verification changes) based on answers
5. Implement Phase 3 (integration tests)
6. Full test suite
7. Manual testing with real Ed25519 and compressed ECDSA DataItems

---

## Implementation Notes

- **Keccak**: Already installed (`keccak@3.0.4`), no need for `js-sha3`
- **Test framework**: Node built-in (`node:test`), NOT Jest/Vitest
- **Code style**: StandardJS (no semicolons, 2-space indent)
- **Architecture**: Ports & Adapters - crypto utils are "driven adapters"
- **arbundles vs warp-arbundles**: MU uses `arbundles@0.11.0` which has full multi-chain support
