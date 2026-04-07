import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../logger.js'
import { deployMessageSchema, deployMonitorSchema, deployProcessSchema, deployAssignSchema, signerSchema } from '../dal.js'
import { deployMessageWith, deployProcessWith, deployMonitorWith, deployUnmonitorWith, deployAssignWith } from './ao-mu.js'

const MU_URL = globalThis.MU_URL || 'https://ao-mu-1.onrender.com'
const logger = createLogger('@permaweb/ao-sdk:readState')

describe('ao-mu', () => {
  describe('deployUnmonitorWith', () => {
    test('sign process id and post to mu', async () => {
      const deployUnmonitor = deployMonitorSchema.implement(
        deployUnmonitorWith({
          MU_URL,
          logger,
          fetch: async (url, options) => {
            assert.equal(url, MU_URL + '/monitor/process-id-1234')
            assert.deepStrictEqual(options, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/octet-stream',
                Accept: 'application/json'
              },
              redirect: 'follow',
              body: 'raw-buffer'
            })

            return new Response(JSON.stringify({ foo: 'bar' }))
          }
        })
      )

      const res = await deployUnmonitor({
        processId: 'process-id-1234',
        data: 'data-123',
        tags: [
          { name: 'foo', value: 'bar' },
          { name: 'Content-Type', value: 'text/plain' }
        ],
        signer: signerSchema.implement(
          async (create) => {
            const { data, tags, target } = await create({ passthrough: true })
            assert.ok(data)
            assert.deepStrictEqual(tags, [
              { name: 'foo', value: 'bar' },
              { name: 'Content-Type', value: 'text/plain' }
            ])
            assert.equal(target, 'process-id-1234')
            return { id: 'monitor-id-1234', raw: 'raw-buffer' }
          }
        )
      })

      assert.deepStrictEqual(res, {
        res: { ok: true },
        messageId: 'monitor-id-1234'
      })
    })
  })

  describe('deployMonitorWith', () => {
    test('sign process id and post to mu', async () => {
      const deployMonitor = deployMonitorSchema.implement(
        deployMonitorWith({
          MU_URL,
          logger,
          fetch: async (url, options) => {
            assert.equal(url, MU_URL + '/monitor/process-id-1234')
            assert.deepStrictEqual(options, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/octet-stream',
                Accept: 'application/json'
              },
              redirect: 'follow',
              body: 'raw-buffer'
            })

            return new Response(JSON.stringify({ foo: 'bar' }))
          }
        })
      )

      const res = await deployMonitor({
        processId: 'process-id-1234',
        data: 'data-123',
        tags: [
          { name: 'foo', value: 'bar' },
          { name: 'Content-Type', value: 'text/plain' }
        ],
        signer: signerSchema.implement(
          async (create) => {
            const { data, tags, target } = await create({ passthrough: true })
            assert.ok(data)
            assert.deepStrictEqual(tags, [
              { name: 'foo', value: 'bar' },
              { name: 'Content-Type', value: 'text/plain' }
            ])
            assert.equal(target, 'process-id-1234')
            return { id: 'monitor-id-1234', raw: 'raw-buffer' }
          }
        )
      })

      assert.deepStrictEqual(res, {
        res: { ok: true },
        messageId: 'monitor-id-1234'
      })
    })
  })

  describe('deployMessageWith', () => {
    test('sign and deploy the message, and return the id', async () => {
      const deployMessage = deployMessageSchema.implement(
        deployMessageWith({
          MU_URL,
          logger,
          fetch: async (url, options) => {
            assert.equal(url, MU_URL)
            assert.deepStrictEqual(options, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/octet-stream',
                Accept: 'application/json'
              },
              redirect: 'follow',
              body: 'raw-buffer'
            })

            return new Response(JSON.stringify({ message: 'foobar' }))
          }
        })
      )

      const res = await deployMessage({
        processId: 'process-123',
        data: 'data-123',
        tags: [
          { name: 'foo', value: 'bar' },
          { name: 'Content-Type', value: 'text/plain' }
        ],
        anchor: 'idempotent-123',
        signer: signerSchema.implement(
          async (create) => {
            const { data, tags, target, anchor } = await create({ passthrough: true })
            assert.ok(data)
            assert.deepStrictEqual(tags, [
              { name: 'foo', value: 'bar' },
              { name: 'Content-Type', value: 'text/plain' }
            ])
            assert.equal(target, 'process-123')
            assert.equal(anchor, 'idempotent-123')

            return { id: 'data-item-123', raw: 'raw-buffer' }
          }
        )
      })

      assert.deepStrictEqual(res, {
        res: { message: 'foobar' },
        messageId: 'data-item-123'
      })
    })

    test('return assignment slot when returnAssignmentSlot is true', async () => {
      let suFetchCalled = false
      let muFetchCalled = false
      const deployMessage = deployMessageWith({
        MU_URL,
        logger,
        locate: async (processId) => {
          assert.equal(processId, 'process-123')
          return { url: 'https://su-router.ao-testnet.xyz' }
        },
        fetch: async (url, options) => {
          if (url === MU_URL) {
            muFetchCalled = true
            assert.deepStrictEqual(options, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/octet-stream',
                Accept: 'application/json'
              },
              redirect: 'follow',
              body: 'raw-buffer'
            })
            return new Response(JSON.stringify({ message: 'foobar' }))
          } else if (url === 'https://su-router.ao-testnet.xyz/data-item-123?process-id=process-123') {
            suFetchCalled = true
            return new Response(JSON.stringify({
              assignment: {
                tags: [
                  { name: 'Nonce', value: '42' }
                ]
              }
            }))
          }
          throw new Error(`Unexpected URL: ${url}`)
        }
      })

      const res = await deployMessage({
        processId: 'process-123',
        data: 'data-123',
        tags: [
          { name: 'foo', value: 'bar' },
          { name: 'Content-Type', value: 'text/plain' }
        ],
        anchor: 'idempotent-123',
        returnAssignmentSlot: true,
        signer: signerSchema.implement(
          async (create) => {
            const { data, tags, target, anchor } = await create({ passthrough: true })
            assert.ok(data)
            assert.deepStrictEqual(tags, [
              { name: 'foo', value: 'bar' },
              { name: 'Content-Type', value: 'text/plain' }
            ])
            assert.equal(target, 'process-123')
            assert.equal(anchor, 'idempotent-123')

            return { id: 'data-item-123', raw: 'raw-buffer' }
          }
        )
      })

      assert.ok(muFetchCalled, 'MU fetch should have been called')
      assert.ok(suFetchCalled, 'SU fetch should have been called')
      assert.deepStrictEqual(res, {
        res: { message: 'foobar' },
        messageId: 'data-item-123',
        assignmentSlot: '42'
      })
    })
  })

  describe('deployProcessWith', () => {
    test('register the contract, and return the id', async () => {
      const deployProcess = deployProcessSchema.implement(
        deployProcessWith({
          MU_URL,
          logger,
          fetch: async (url, options) => {
            assert.equal(url, MU_URL)
            assert.deepStrictEqual(options, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/octet-stream',
                Accept: 'application/json'
              },
              redirect: 'follow',
              body: 'raw-buffer'
            })

            return new Response(JSON.stringify({ foo: 'bar' }))
          }
        })
      )

      await deployProcess({
        data: '1234',
        tags: [{ name: 'foo', value: 'bar' }],
        signer: signerSchema.implement(
          async (create) => {
            const { data, tags } = await create({ passthrough: true })
            assert.ok(data)
            assert.deepStrictEqual(tags, [
              { name: 'foo', value: 'bar' }
            ])
            return { id: 'data-item-123', raw: 'raw-buffer' }
          }
        )
      })
    })
  })

  describe('deployAssignWith', () => {
    test('deploy an assignment to the MU', async () => {
      const deployAssign = deployAssignSchema.implement(
        deployAssignWith({
          MU_URL,
          logger,
          fetch: async (url, options) => {
            assert.equal(url, `${MU_URL}?process-id=process-1&assign=message-1`)
            assert.deepStrictEqual(options, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/octet-stream',
                Accept: 'application/json'
              }
            })

            return new Response(JSON.stringify({ id: 'assignment-id' }))
          }
        })
      )

      await deployAssign({
        process: 'process-1',
        message: 'message-1'
      })
    })
  })

  describe('deployAssignWith', () => {
    test('deploy an assignment to the MU with base-layer and exclude', async () => {
      const deployAssign = deployAssignSchema.implement(
        deployAssignWith({
          MU_URL,
          logger,
          fetch: async (url, options) => {
            assert.equal(url, `${MU_URL}?process-id=process-1&assign=message-1&base-layer&exclude=data,tags`)
            assert.deepStrictEqual(options, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/octet-stream',
                Accept: 'application/json'
              }
            })

            return new Response(JSON.stringify({ id: 'assignment-id' }))
          }
        })
      )

      await deployAssign({
        process: 'process-1',
        message: 'message-1',
        baseLayer: true,
        exclude: ['data', 'tags']
      })
    })
  })
})
