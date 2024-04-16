import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../logger.js'
import { deployMessageSchema, deployMonitorSchema, deployProcessSchema, signerSchema, deployAssignSchema } from '../dal.js'
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
          async ({ data, tags, target }) => {
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
          async ({ data, tags, target }) => {
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
          async ({ data, tags, target, anchor }) => {
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
          async ({ data, tags }) => {
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
