import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../../logger.js'
import { verifyInputsWith } from './verify-inputs.js'

const CONTRACT = 'zVkjFCALjk4xxuCilddKS8ShZ-9HdeqeuYQOgMgWucro'

const logger = createLogger('createContract')

describe('verify-input', () => {
  test('verify source tags and verify signer', async () => {
    const verifyInput = verifyInputsWith({
      loadTransactionMeta: async (_id) =>
        ({
          tags: [
            { name: 'Content-Type', value: 'application/wasm' },
            { name: 'Contract-Type', value: 'ao' }
          ]
        }),
      logger
    })

    await verifyInput({
      srcId: CONTRACT,
      initialState: { balances: { foo: 1 } },
      signer: () => {},
      tags: [
        { name: 'foo', value: 'bar' }
      ]
    }).toPromise().then(assert.ok)
  })

  test('throw if missing Content-Type', async () => {
    const verifyInput = verifyInputsWith({
      loadTransactionMeta: async (_id) =>
        ({
          tags: [
            { name: 'No-Content-Type', value: 'application/wasm' },
            { name: 'Contract-Type', value: 'ao' }
          ]
        }),
      logger
    })

    await verifyInput({
      srcId: CONTRACT,
      initialState: { balances: { foo: 1 } },
      signer: () => {},
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
      loadTransactionMeta: async (_id) =>
        ({
          tags: [
            { name: 'Content-Type', value: 'application/wasm' },
            { name: 'Contract-Type', value: 'something else' }
          ]
        }),
      logger
    })

    await verifyInput({
      srcId: CONTRACT,
      initialState: { balances: { foo: 1 } },
      signer: () => {},
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

  test('throw if signer is not found', async () => {
    const verifyInput = verifyInputsWith({
      loadTransactionMeta: async (_id) =>
        ({
          tags: [
            { name: 'Content-Type', value: 'application/wasm' },
            { name: 'Contract-Type', value: 'ao' }
          ]
        }),
      logger
    })

    await verifyInput({
      srcId: CONTRACT,
      initialState: { balances: { foo: 1 } },
      signer: undefined,
      tags: [
        { name: 'foo', value: 'bar' }
      ],
      logger
    }).toPromise()
      .then(assert.fail)
      .catch(err => {
        assert.equal(
          err,
          'signer not found'
        )
      })
  })
})
