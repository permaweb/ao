import { describe, test } from 'node:test'
import assert from 'node:assert'

import { createLogger } from '../logger.js'
import { dbClientSchema } from '../dal.js'
import {
  COLLATION_SEQUENCE_MAX_CHAR,
  findLatestEvaluationWith,
  saveEvaluationWith
} from './pouchdb.js'

const logger = createLogger('db')

describe('pouchdb', () => {
  describe('findLatestEvaluation', () => {
    test('return the lastest interaction', async () => {
      const cachedAt = new Date().toISOString()
      const findLatestEvaluation = dbClientSchema.shape
        .findLatestEvaluation
        .parse(findLatestEvaluationWith({
          pouchDb: {
            find: async (op) => {
              assert.deepStrictEqual(op, {
                selector: {
                  _id: {
                    $gte: 'contract-123',
                    $lte: 'contract-123,sortkey-910'
                  }
                },
                sort: [{ _id: 'desc' }],
                limit: 1
              })
              return {
                docs: [
                  {
                    _id: 'contract-123,sortkey-890',
                    sortKey: 'sortkey-890',
                    parent: 'contract-123',
                    action: { input: { function: 'noop' } },
                    output: { state: { foo: 'bar' } },
                    cachedAt
                  }
                ]
              }
            }
          },
          logger
        }))

      const res = await findLatestEvaluation({
        id: 'contract-123',
        to: 'sortkey-910'
      })

      assert.equal(res.sortKey, 'sortkey-890')
      assert.equal(res.parent, 'contract-123')
      assert.equal(res.parent, 'contract-123')
      assert.deepStrictEqual(res.action, { input: { function: 'noop' } })
      assert.deepStrictEqual(res.output, { state: { foo: 'bar' } })
      assert.equal(res.cachedAt.toISOString(), cachedAt)
    })

    test("without 'to', return the lastest interaction using collation sequence max char", async () => {
      const cachedAt = new Date().toISOString()
      const findLatestEvaluation = dbClientSchema.shape
        .findLatestEvaluation
        .parse(findLatestEvaluationWith({
          pouchDb: {
            find: async (op) => {
              assert.deepStrictEqual(op, {
                selector: {
                  _id: {
                    $gte: 'contract-123',
                    $lte: `contract-123,${COLLATION_SEQUENCE_MAX_CHAR}`
                  }
                },
                sort: [{ _id: 'desc' }],
                limit: 1
              })
              return {
                docs: [
                  {
                    _id: 'contract-123,sortkey-890',
                    sortKey: 'sortkey-890',
                    parent: 'contract-123',
                    action: { input: { function: 'noop' } },
                    output: { state: { foo: 'bar' } },
                    cachedAt
                  }
                ]
              }
            }
          },
          logger
        }))

      const res = await findLatestEvaluation({
        id: 'contract-123'
      })

      assert.equal(res.sortKey, 'sortkey-890')
      assert.equal(res.parent, 'contract-123')
      assert.equal(res.parent, 'contract-123')
      assert.deepStrictEqual(res.action, { input: { function: 'noop' } })
      assert.deepStrictEqual(res.output, { state: { foo: 'bar' } })
      assert.equal(res.cachedAt.toISOString(), cachedAt)
    })

    test('rejects if no interaction is found', async () => {
      const findLatestEvaluation = findLatestEvaluationWith({
        pouchDb: {
          find: async () => ({ docs: [] })
        },
        logger
      })
      await findLatestEvaluation({
        id: 'contract-123',
        to: 'sortkey-910'
      })
        .then(assert.fail)
        .catch(() => assert.ok(true))
    })
  })

  describe('saveEvaluation', () => {
    test('save the interaction to pouchdb', async () => {
      const cachedAt = new Date().toISOString()
      const saveEvaluation = dbClientSchema.shape.saveEvaluation
        .parse(
          saveEvaluationWith({
            pouchDb: {
              get: async () => undefined,
              put: (doc) => {
                assert.equal(doc._id, 'contract-123,sortkey-890')
                assert.equal(doc.sortKey, 'sortkey-890')
                assert.equal(doc.parent, 'contract-123')
                assert.deepStrictEqual(doc.action, {
                  input: { function: 'noop' }
                })
                assert.deepStrictEqual(doc.output, { state: { foo: 'bar' } })
                assert.equal(doc.cachedAt.toISOString(), cachedAt)
                return Promise.resolve(true)
              }
            },
            logger
          })
        )

      await saveEvaluation({
        sortKey: 'sortkey-890',
        parent: 'contract-123',
        action: { input: { function: 'noop' } },
        output: { state: { foo: 'bar' } },
        cachedAt
      })
    })

    test('noop if the interaction already exists', async () => {
      const saveEvaluation = dbClientSchema.shape.saveEvaluation
        .parse(
          saveEvaluationWith({
            pouchDb: {
              get: async () => ({
                _id: 'contract-123,sortkey-890',
                sortKey: 'sortkey-890',
                parent: 'contract-123',
                action: { input: { function: 'noop' } },
                output: { state: { foo: 'bar' } },
                cachedAt: new Date()
              }),
              put: assert.fail
            },
            logger
          })
        )

      await saveEvaluation({
        sortKey: 'sortkey-890',
        parent: 'contract-123',
        action: { input: { function: 'noop' } },
        output: { state: { foo: 'bar' } },
        cachedAt: new Date()
      })
    })
  })
})
