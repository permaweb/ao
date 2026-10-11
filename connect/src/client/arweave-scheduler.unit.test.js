import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import {
  ARWEAVE_SCHEDULER_DEVICE,
  PendingAssignmentError,
  SchedulerMismatchError,
  balanceWith,
  messageWith,
  toTransactionSigner,
  verifyProcessWith,
  waitForAssignmentWith
} from './arweave-scheduler.js'

const URL = 'https://node.example'
const PROCESS = 'p'.repeat(43)
const ADDRESS = 'a'.repeat(43)
const TXID = 't'.repeat(43)

const ok = (body) => ({
  ok: true,
  status: 200,
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body))
})
const fail = (status, body = '') => ({
  ok: false,
  status,
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body))
})

/** Minimal arweave-js stand-in: records the fields the scheduler depends on. */
const fakeArweave = ({ postStatus = 200, onPost } = {}) => ({
  createTransaction: async (fields) => ({
    ...fields,
    tags: [],
    addTag (name, value) { this.tags.push({ name, value }) },
    toJSON () { return { ...fields, tags: this.tags, id: this.id, signature: this.signature } }
  }),
  transactions: {
    sign: async (tx) => { tx.signature = 'sig'; tx.id = TXID },
    post: async (tx) => { onPost?.(tx); return { status: postStatus, statusText: 'posted' } }
  }
})

describe('arweave-scheduler signer normalization', () => {
  test('passes a function through as a custody adapter', () => {
    const fn = async () => {}
    assert.equal(toTransactionSigner(fn), fn)
  })

  test('adapts a browser wallet exposing sign(tx)', async () => {
    const signed = []
    const sign = toTransactionSigner({ sign: async (tx) => { signed.push(tx); return tx } })
    await sign({ marker: 1 }, {})
    assert.deepEqual(signed, [{ marker: 1 }])
  })

  test('signs a JWK through arweave-js', async () => {
    const arweave = fakeArweave()
    const sign = toTransactionSigner({ n: 'modulus', d: 'private' })
    const tx = {}
    await sign(tx, { arweave })
    assert.equal(tx.signature, 'sig')
  })

  test('rejects a signer it cannot interpret', () => {
    assert.throws(() => toTransactionSigner(42), /Unsupported signer/)
  })
})

describe('arweave-scheduler process verification', () => {
  test('accepts a process scheduled by arweave-scheduler@1.0', async () => {
    const verify = verifyProcessWith({
      URL,
      fetch: async () => ok({ 'scheduler-device': ARWEAVE_SCHEDULER_DEVICE, ticker: 'tAO' })
    })
    assert.equal((await verify(PROCESS)).ticker, 'tAO')
  })

  test('refuses a process scheduled by another device', async () => {
    const verify = verifyProcessWith({
      URL,
      fetch: async () => ok({ 'scheduler-device': 'scheduler@1.0' })
    })
    await assert.rejects(() => verify(PROCESS), SchedulerMismatchError)
  })

  test('reads each process once', async () => {
    let reads = 0
    const verify = verifyProcessWith({
      URL,
      fetch: async () => { reads += 1; return ok({ 'scheduler-device': ARWEAVE_SCHEDULER_DEVICE }) }
    })
    await verify(PROCESS)
    await verify(PROCESS)
    assert.equal(reads, 1)
  })
})

describe('arweave-scheduler message', () => {
  const routes = ({ onPost } = {}) => async (url, init) => {
    if (String(url).endsWith('/now')) return ok({ 'scheduler-device': ARWEAVE_SCHEDULER_DEVICE })
    if (String(url).includes('/~arweave-scheduler@1.0/slot&target=')) return ok({ current: 4 })
    if (String(url).includes('~process@1.0/schedule') && init?.method === 'POST') {
      return onPost ? onPost(url, init) : ok({ status: 202, txid: TXID })
    }
    throw new Error(`unexpected request ${url}`)
  }

  test('submits a data-free transaction targeting the process', async () => {
    let posted
    const message = messageWith({
      URL,
      arweave: fakeArweave({ onPost: (tx) => { posted = tx } }),
      signer: { n: 'modulus', d: 'private' },
      fetch: routes()
    })

    const id = await message({
      process: PROCESS,
      tags: [
        { name: 'Action', value: 'Transfer' },
        { name: 'Recipient', value: ADDRESS },
        { name: 'Quantity', value: '100' }
      ]
    })

    assert.equal(id, TXID)
    assert.equal(posted.target, PROCESS, 'targets the process')
    assert.equal(posted.quantity, '0', 'moves no AR')
    assert.equal(posted.data, '', 'stays data-free so the scheduler routes it')
    assert.deepEqual(
      posted.tags.map((tag) => tag.name),
      ['Action', 'Recipient', 'Quantity'],
      'keeps the exchange tag names the codec lowercases for us'
    )
  })

  test('routes with Assign-To and no native target when asked', async () => {
    let posted
    const message = messageWith({
      URL,
      arweave: fakeArweave({ onPost: (tx) => { posted = tx } }),
      signer: { n: 'modulus', d: 'private' },
      fetch: routes()
    })

    await message({
      process: PROCESS,
      assignTo: true,
      tags: [{ name: 'Action', value: 'Transfer' }]
    })

    assert.equal(posted.target, undefined, 'no native target, so no activation surcharge')
    assert.deepEqual(posted.tags[0], { name: 'Assign-To', value: PROCESS })
    assert.equal(posted.tags[1].name, 'Action')
  })

  test('refuses an object tag value rather than signing "[object Object]"', async () => {
    let posted = false
    const message = messageWith({
      URL,
      arweave: fakeArweave({ onPost: () => { posted = true } }),
      signer: { n: 'modulus', d: 'private' },
      fetch: routes()
    })
    await assert.rejects(
      () => message({ process: PROCESS, tags: [{ name: 'Quantity', value: { amount: 1 } }] }),
      /must be a string, number, bigint or boolean/
    )
    assert.equal(posted, false, 'nothing is broadcast, because a tx cannot be withdrawn')
  })

  test('accepts numeric and bigint tag values', async () => {
    let posted
    const message = messageWith({
      URL,
      arweave: fakeArweave({ onPost: (tx) => { posted = tx } }),
      signer: { n: 'modulus', d: 'private' },
      fetch: routes()
    })
    await message({
      process: PROCESS,
      tags: [{ name: 'Quantity', value: 10n }, { name: 'Nonce', value: 3 }]
    })
    assert.deepEqual(posted.tags, [
      { name: 'Quantity', value: '10' },
      { name: 'Nonce', value: '3' }
    ])
  })

  test('refuses to sign for a process on another scheduler', async () => {
    const message = messageWith({
      URL,
      arweave: fakeArweave(),
      signer: { n: 'modulus', d: 'private' },
      fetch: async (url) => {
        if (String(url).endsWith('/now')) return ok({ 'scheduler-device': 'scheduler@1.0' })
        throw new Error('must not reach submission')
      }
    })
    await assert.rejects(() => message({ process: PROCESS, tags: [] }), SchedulerMismatchError)
  })

  test('surfaces a gateway refusal with its status', async () => {
    const message = messageWith({
      URL,
      arweave: fakeArweave({ postStatus: 400 }),
      signer: { n: 'modulus', d: 'private' },
      fetch: routes()
    })
    await assert.rejects(() => message({ process: PROCESS, tags: [] }), (error) => {
      assert.equal(error.status, 400)
      assert.equal(error.id, TXID)
      return true
    })
  })

  test('relays through the node and surfaces its refusal when asked to', async () => {
    const message = messageWith({
      URL,
      arweave: fakeArweave(),
      signer: { n: 'modulus', d: 'private' },
      fetch: routes({ onPost: () => fail(422, { reason: 'wrong target', code: 'AO_NATIVE_TRANSPORT_REQUIRED' }) })
    })
    await assert.rejects(() => message({ process: PROCESS, tags: [], submit: 'node' }), (error) => {
      assert.equal(error.status, 422)
      assert.equal(error.code, 'AO_NATIVE_TRANSPORT_REQUIRED')
      return true
    })
  })
})

describe('arweave-scheduler assignment', () => {
  test('returns the slot as a decimal string', async () => {
    const waitForAssignment = waitForAssignmentWith({
      URL,
      fetch: async (url) => {
        if (String(url).includes('/slot&target=')) return ok({ current: 7 })
        return ok({ 5: { slot: 5, body: { id: 'other' } }, 6: { slot: 6, body: { id: TXID } } })
      }
    })
    assert.equal(await waitForAssignment({ process: PROCESS, message: TXID, from: 5 }), '6')
  })

  test('reports a pending error rather than a false negative on timeout', async () => {
    const waitForAssignment = waitForAssignmentWith({
      URL,
      fetch: async (url) => (String(url).includes('/slot&target=') ? ok({ current: -1 }) : ok({}))
    })
    await assert.rejects(
      () => waitForAssignment({ process: PROCESS, message: TXID, timeout: 0, interval: 1 }),
      (error) => {
        assert.ok(error instanceof PendingAssignmentError)
        assert.equal(error.code, 'AO_ASSIGNMENT_PENDING')
        assert.equal(error.id, TXID)
        return true
      }
    )
  })
})

describe('arweave-scheduler balance', () => {
  test('reads through the token device balance key', async () => {
    let requested
    const balance = balanceWith({ URL, fetch: async (url) => { requested = String(url); return ok({ 'ao-result': 'body', body: 4242 }) } })
    assert.equal(await balance({ process: PROCESS, address: ADDRESS }), '4242')
    assert.ok(requested.includes(`/${PROCESS}~process@1.0/now/as/balance?as=execution&balance=${ADDRESS}`))
  })

  test('accepts the scalar inside a message body', async () => {
    const balance = balanceWith({ URL, fetch: async () => ok({ balance: '99' }) })
    assert.equal(await balance({ process: PROCESS, address: ADDRESS }), '99')
  })

  test('matches a lowercased balance trie key', async () => {
    // The deployed token@1.0 build canonicalizes trie keys, so a mixed-case
    // Arweave address must still find its own leaf.
    const mixedCase = 'wCSXTL1g1Entfpv5iyPNHxJlk9N6MfhYve2reKFJWTg'
    const balance = balanceWith({ URL, fetch: async () => ok({ [mixedCase.toLowerCase()]: 7 }) })
    assert.equal(await balance({ process: PROCESS, address: mixedCase }), '7')
  })

  test('leaves an unavailable balance unavailable instead of reporting zero', async () => {
    const balance = balanceWith({ URL, fetch: async () => fail(503) })
    await assert.rejects(() => balance({ process: PROCESS, address: ADDRESS }), /Balance read failed/)
  })
})
