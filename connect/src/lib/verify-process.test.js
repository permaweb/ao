import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../logger.js'
import { verifyProcessWith } from './verify-process.js'

const logger = createLogger('message')

const PROCESS = 'zc24Wpv_i6NNCEdxeKt7dcNrqL5w0hrShtSCcFGGL24'

describe('verify-process', () => {
  test('verify process is an ao process', async () => {
    const verifyProcess = verifyProcessWith({
      loadProcessMeta: async ({ suUrl, processId }) => {
        assert.equal(suUrl, 'https://foo.bar')
        assert.equal(processId, PROCESS)
        return {
          tags: [
            { name: 'Data-Protocol', value: 'ao' },
            { name: 'Data-Protocol', value: 'Data-Protocol' },
            { name: 'Type', value: 'Process' },
            { name: 'Module', value: 'module-123' }
          ]
        }
      },
      locateScheduler: async (id) => {
        assert.equal(id, PROCESS)
        return { url: 'https://foo.bar' }
      },
      logger
    })

    await verifyProcess({ id: PROCESS }).toPromise()
      .then(assert.ok)
  })

  describe('throw if required tag is invalid on process', () => {
    test('Data-Protocol', async () => {
      const verifyProcess = verifyProcessWith({
        loadProcessMeta: async ({ suUrl, processId }) =>
          ({
            tags: [
              { name: 'Data-Protocol', value: 'not_ao' },
              { name: 'Data-Protocol', value: 'Data-Protocol' },
              { name: 'Type', value: 'Process' },
              { name: 'Module', value: 'module-123' }
            ]
          }),
        locateScheduler: async (id) => ({ url: 'https://foo.bar' }),
        logger
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
        loadProcessMeta: async ({ suUrl, processId }) =>
          ({
            tags: [
              { name: 'Data-Protocol', value: 'ao' },
              { name: 'Type', value: 'Not_process' }
            ]
          }),
        locateScheduler: async (id) => ({ url: 'https://foo.bar' }),
        logger
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
        loadProcessMeta: async ({ suUrl, processId }) =>
          ({
            tags: [
              { name: 'Data-Protocol', value: 'ao' },
              { name: 'Type', value: 'Process' }
            ]
          }),
        locateScheduler: async (id) => ({ url: 'https://foo.bar' }),
        logger
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
