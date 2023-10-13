/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import assert from 'node:assert'

import { createLogger } from '../logger.js'
import { findProcessSchema, saveProcessSchema } from '../dal.js'
import {
  findProcessWith,
  saveProcessWith
} from './pouchdb.js'

const logger = createLogger('db')

describe('pouchdb', () => {
  describe('findProcess', () => {
    test('find the process', async () => {
      const findProcess = findProcessSchema.implement(
        findProcessWith({
          pouchDb: {
            get: async () => ({
              _id: 'process-123',
              owner: 'woohoo',
              tags: [{ name: 'foo', value: 'bar' }],
              type: 'process'
            })
          }
        })
      )

      const res = await findProcess({ processId: 'process-123' })
      assert.deepStrictEqual(res, {
        id: 'process-123',
        owner: 'woohoo',
        tags: [{ name: 'foo', value: 'bar' }]
      })
    })

    test('bubble error', async () => {
      const findProcess = findProcessSchema.implement(
        findProcessWith({
          pouchDb: {
            get: async () => { throw { status: 404 } }
          }
        })
      )

      await findProcess({ processId: 'process-123' })
        .then(assert.fail)
        .catch(assert.ok)
    })
  })

  describe('saveProcess', () => {
    test('save the process', async () => {
      const saveProcess = saveProcessSchema.implement(
        saveProcessWith({
          pouchDb: {
            get: async () => undefined,
            put: (doc) => {
              assert.deepStrictEqual(doc, {
                _id: 'process-123',
                owner: 'woohoo',
                tags: [{ name: 'foo', value: 'bar' }],
                type: 'process'
              })
              return Promise.resolve(true)
            }
          },
          logger
        })
      )

      await saveProcess({
        id: 'process-123',
        owner: 'woohoo',
        tags: [{ name: 'foo', value: 'bar' }]
      })
    })

    test('noop if the process already exists', async () => {
      const saveProcess = saveProcessSchema.implement(
        saveProcessWith({
          pouchDb: {
            get: async () => ({
              _id: 'process-123',
              owner: 'woohoo',
              tags: [{ name: 'foo', value: 'bar' }]
            }),
            put: assert.fail
          },
          logger
        })
      )

      await saveProcess({
        id: 'process-123',
        owner: 'woohoo',
        tags: [{ name: 'foo', value: 'bar' }]
      })
    })
  })
})
