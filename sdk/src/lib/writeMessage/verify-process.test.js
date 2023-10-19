import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { verifyProcessWith } from './verify-process.js'

const PROCESS = 'zc24Wpv_i6NNCEdxeKt7dcNrqL5w0hrShtSCcFGGL24'

describe('verify-process', () => {
  test('verify process is an ao process', async () => {
    const verifyProcess = verifyProcessWith({
      loadTransactionMeta: async (_id) =>
        ({
          tags: [
            { name: 'Contract-Src', value: 'foobar' },
            { name: 'Data-Protocol', value: 'ao' },
            { name: 'ao-type', value: 'process' }
          ]
        })
    })

    await verifyProcess({ id: PROCESS }).toPromise()
      .then(assert.ok)
      .catch(() => assert('unreachable. Should have succeeded'))
  })

  test('throw if the Contract-Src tag is not provided', async () => {
    const verifyProcess = verifyProcessWith({
      loadTransactionMeta: async (_id) =>
        ({
          tags: [
            { name: 'Data-Protocol', value: 'ao' },
            { name: 'ao-type', value: 'process' }
          ]
        })
    })

    await verifyProcess({ id: PROCESS }).toPromise()
      .catch(assert.ok)
  })

  test('throw if the Data-Protocol tag is not provided', async () => {
    const verifyProcess = verifyProcessWith({
      loadTransactionMeta: async (_id) =>
        ({
          tags: [
            { name: 'Contract-Src', value: 'foobar' },
            { name: 'ao-type', value: 'process' }
          ]
        })
    })

    await verifyProcess({ id: PROCESS }).toPromise()
      .catch(assert.ok)
  })

  test('throw if multiple tags not provided', async () => {
    const verifyProcess = verifyProcessWith({
      loadTransactionMeta: async (_id) =>
        ({
          tags: [
            { name: 'Data-Protocol', value: 'ao' }
          ]
        })
    })

    await verifyProcess({ id: PROCESS }).toPromise()
      .catch(assert.ok)
  })
})
