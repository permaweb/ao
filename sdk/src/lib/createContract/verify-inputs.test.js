import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { Resolved } from 'hyper-async'

import { createLogger } from '../../logger.js'
import { verifyInputsWith } from './verify-inputs.js'

const CONTRACT = 'zVkjFCALjk4xxuCilddKS8ShZ-9HdeqeuYQOgMgWucro'

const logger = createLogger('createContract')

describe('verify-input', () => {
  test('verify source tags and read the wallet', async () => {
    const verifyInput = verifyInputsWith({
      loadTransactionMeta: (_id) =>
        Resolved({
          tags: [
            { name: 'App-Name', value: 'SmartWeaveContractSource' },
            { name: 'Content-Type', value: 'application/wasm' },
            { name: 'Contract-Type', value: 'ao' }
          ]
        }),
      walletExists: (path) => {
        assert.equal(path, '/foo/bar')
        return Resolved(true)
      },
      readWallet: (path) => {
        assert.equal(path, '/foo/bar')
        return Resolved({ foo: 'bar' })
      },
      logger
    })

    await verifyInput({
      srcId: CONTRACT,
      initialState: { balances: { foo: 1 } },
      walletPath: '/foo/bar',
      tags: [
        { name: 'foo', value: 'bar' }
      ]
    }).toPromise()
      .then(res => assert.deepStrictEqual(res.wallet, { foo: 'bar' }))
  })

  test('throw if source is missing correct App-Name', async () => {
    const verifyInput = verifyInputsWith({
      loadTransactionMeta: (_id) =>
        Resolved({
          tags: [
            { name: 'App-Name', value: 'NotRightValue' },
            { name: 'Content-Type', value: 'application/wasm' },
            { name: 'Contract-Type', value: 'ao' }
          ]
        }),
      walletExists: () => Resolved(true),
      readWallet: () => Resolved({ foo: 'bar' }),
      logger
    })

    await verifyInput({
      srcId: CONTRACT,
      initialState: { balances: { foo: 1 } },
      walletPath: '/foo/bar',
      tags: [
        { name: 'foo', value: 'bar' }
      ]
    }).toPromise()
      .then(assert.fail)
      .catch(err => {
        assert.equal(
          err,
          "Tag 'App-Name' of value 'NotRightValue' was not valid on contract source"
        )
      })
  })

  test('throw if missing Content-Type', async () => {
    const verifyInput = verifyInputsWith({
      loadTransactionMeta: (_id) =>
        Resolved({
          tags: [
            { name: 'App-Name', value: 'SmartWeaveContractSource' },
            { name: 'No-Content-Type', value: 'application/wasm' },
            { name: 'Contract-Type', value: 'ao' }
          ]
        }),
      walletExists: () => Resolved(true),
      readWallet: () => Resolved({ foo: 'bar' }),
      logger
    })

    await verifyInput({
      srcId: CONTRACT,
      initialState: { balances: { foo: 1 } },
      walletPath: '/foo/bar',
      tags: [
        { name: 'foo', value: 'bar' }
      ]
    }).toPromise()
      .then(assert.fail)
      .catch(err => {
        assert.equal(
          err,
          "Tag 'Content-Type' of value 'undefined' was not valid on contract source"
        )
      })
  })

  test('throw if missing Content-Type', async () => {
    const verifyInput = verifyInputsWith({
      loadTransactionMeta: (_id) =>
        Resolved({
          tags: [
            { name: 'App-Name', value: 'SmartWeaveContractSource' },
            { name: 'Content-Type', value: 'application/wasm' },
            { name: 'Contract-Type', value: 'something else' }
          ]
        }),
      walletExists: () => Resolved(true),
      readWallet: () => Resolved({ foo: 'bar' }),
      logger
    })

    await verifyInput({
      srcId: CONTRACT,
      initialState: { balances: { foo: 1 } },
      walletPath: '/foo/bar',
      tags: [
        { name: 'foo', value: 'bar' }
      ]
    }).toPromise()
      .then(assert.fail)
      .catch(err => {
        assert.equal(
          err,
          "Tag 'Contract-Type' of value 'something else' was not valid on contract source"
        )
      })
  })

  test('throw if wallet is not found', async () => {
    const verifyInput = verifyInputsWith({
      loadTransactionMeta: (_id) =>
        Resolved({
          tags: [
            { name: 'App-Name', value: 'SmartWeaveContractSource' },
            { name: 'Content-Type', value: 'application/wasm' },
            { name: 'Contract-Type', value: 'ao' }
          ]
        }),
      walletExists: () => Resolved(false),
      readWallet: () => assert.fail('should never get to readWallet'),
      logger
    })

    await verifyInput({
      srcId: CONTRACT,
      initialState: { balances: { foo: 1 } },
      walletPath: '/foo/bar',
      tags: [
        { name: 'foo', value: 'bar' }
      ],
      logger
    }).toPromise()
      .then(assert.fail)
      .catch(err => {
        assert.equal(
          err,
          'wallet not found'
        )
      })
  })

  test('throw if initial state is not an object', async () => {
    const verifyInput = verifyInputsWith({
      loadTransactionMeta: (_id) =>
        Resolved({
          tags: [
            { name: 'App-Name', value: 'SmartWeaveContractSource' },
            { name: 'Content-Type', value: 'application/wasm' },
            { name: 'Contract-Type', value: 'ao' }
          ]
        }),
      walletExists: (path) => {
        assert.equal(path, '/foo/bar')
        return Resolved(true)
      },
      readWallet: (path) => {
        assert.equal(path, '/foo/bar')
        return Resolved({ foo: 'bar' })
      },
      logger
    })

    await verifyInput({
      srcId: CONTRACT,
      initialState: 'not an object',
      walletPath: '/foo/bar',
      tags: [
        { name: 'foo', value: 'bar' }
      ]
    }).toPromise()
      .then(assert.fail)
      .catch(err => {
        assert.equal(
          err,
          'initialState was not a valid JSON Object'
        )
      })
  })
})
