import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../../logger.js'
import { deleteSpawnDataWith } from './delete-spawn-data.js'

const logger = createLogger('ao-mu:spawnProcess')


describe('deleteSpawnData', () => {
    test('delete spawn by id', async () => {
      const deleteSpawnData = deleteSpawnDataWith({
        deleteSpawn: async (id) => {
            assert.equal(id, 'id-1')
        },
        logger
      })
  
      const result = await deleteSpawnData({
            cachedSpawn: {
                id: 'id-1'
            }
      }).toPromise()

      assert.equal(result.cachedSpawn.id, 'id-1')
    })
})