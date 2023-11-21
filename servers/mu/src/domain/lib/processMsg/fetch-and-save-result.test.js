import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../../logger.js'
import { fetchAndSaveResultWith } from './fetch-and-save-result.js'


const logger = createLogger('ao-mu:processMsg')

describe('fetchAndSaveResult', () => {
    test('fetch result by transaction id', async () => {
      let msg1 = {"tags": [{"name": "Data-Protocol", "value": "ao"}]}
      let spawn1 = {"tags": [{"name": "Data-Protocol", "value": "ao"}]}
      let cachedMsg1 = {
        id: Math.floor(Math.random() * 1e18).toString(),
        fromTxId: 'id-1',
        msg: msg1,
        cachedAt: new Date(),
        processId: 'pid-1'
      }
      let cachedSpawn1 = {
        id: Math.floor(Math.random() * 1e18).toString(),
        fromTxId: 'id-1',
        spawn: spawn1,
        cachedAt: new Date(),
        processId: 'pid-1'
      }
      const fetchAndSaveResult = fetchAndSaveResultWith({
        fetchResult: async (id) => {
            assert.equal(id, 'id-1')
            return {
                messages: [msg1],
                spawns: [spawn1]
            }
        },
        saveMsg: async (msg) => {
            assert.equal(msg.processId, 'pid-1')
            assert.equal(msg.fromTxId, 'id-1')
            assert.deepStrictEqual(msg.msg, msg1)
        },
        saveSpawn: async (spawn) => {
            assert.equal(spawn.processId, 'pid-1')
            assert.equal(spawn.fromTxId, 'id-1')
            assert.deepStrictEqual(spawn.spawn, spawn1)
        },
        findLatestMsgs: async ({fromTxId}) => {
            console.log('hello')
            console.log([cachedMsg1])
            assert.equal(fromTxId, 'id-1')
            return [cachedMsg1]
        },
        findLatestSpawns: async ({fromTxId}) => {
            assert.equal(fromTxId, 'id-1')
            return [cachedSpawn1]
        },
        logger
      })
  
      const result = await fetchAndSaveResult({
            tx: {
                id: 'id-1',
                processId: 'pid-1'
            }
      }).toPromise()

      assert.deepStrictEqual(result.msgs[0], cachedMsg1)
      assert.deepStrictEqual(result.spawns[0], cachedSpawn1)
    })
})