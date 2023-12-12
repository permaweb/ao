import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { verifyProcessWith } from './verify-process.js'

const PROCESS = 'zc24Wpv_i6NNCEdxeKt7dcNrqL5w0hrShtSCcFGGL24'

describe('verify-process', () => {
  test('verify process is an ao process', async () => {
    const verifyProcess = verifyProcessWith({
      loadProcessMeta: async (_id) =>
        ({
          tags: [
            { name: 'Data-Protocol', value: 'ao' },
            { name: 'Data-Protocol', value: 'Data-Protocol' },
            { name: 'Type', value: 'Process' },
            { name: 'Module', value: 'module-123' }
          ]
        })
    })

    await verifyProcess({ id: PROCESS }).toPromise()
      .then(assert.ok)
      .catch(() => assert('unreachable. Should have succeeded'))
  })

  describe('throw if required tag is invalid on process', () => {
    test('Data-Protocol', async () => {
      const verifyProcess = verifyProcessWith({
        loadProcessMeta: async (_id) =>
          ({
            tags: [
              { name: 'Data-Protocol', value: 'not_ao' },
              { name: 'Data-Protocol', value: 'Data-Protocol' },
              { name: 'Type', value: 'Process' },
              { name: 'Module', value: 'module-123' }
            ]
          })
      })

      await verifyProcess({ id: PROCESS }).toPromise()
        .then(assert.fail)
        .catch(err => {
          assert.equal(
            err,
            "Tag 'Data-Protocol': value 'ao' was not found on process"
          )
        })
    })

    test('Type', async () => {
      const verifyProcess = verifyProcessWith({
        loadProcessMeta: async (_id) =>
          ({
            tags: [
              { name: 'Data-Protocol', value: 'ao' },
              { name: 'Type', value: 'Not_process' }
            ]
          })
      })

      await verifyProcess({ id: PROCESS }).toPromise()
        .then(assert.fail)
        .catch(err => {
          assert.equal(
            err,
            "Tag 'Type': value 'Process' was not found on process"
          )
        })
    })

    test('Module', async () => {
      const verifyProcess = verifyProcessWith({
        loadProcessMeta: async (_id) =>
          ({
            tags: [
              { name: 'Data-Protocol', value: 'ao' },
              { name: 'Type', value: 'Process' }
            ]
          })
      })

      await verifyProcess({ id: PROCESS }).toPromise()
        .then(assert.fail)
        .catch(err => {
          assert.equal(
            err,
            "Tag 'Module': was not found on process"
          )
        })
    })
  })
})
