import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../../logger.js'
import { parseDataItemWith } from './parse-data-item.js'

const logger = createLogger('ao-mu:processMsg')

describe('parseDataItem', () => {
    test('parse data item into tx object', async () => {
      let raw1 = Buffer.alloc(0)
      let item1 = {
        id: 'id-1',
        target: 'target-1'
      }
      const parseDataItem = parseDataItemWith({
        createDataItem: (raw) => {
            assert.deepStrictEqual(raw, raw1)
            return item1
        },
        logger
      })
  
      const result = await parseDataItem({
            raw: raw1
      }).toPromise()
      
      assert.equal(result.tx.id, 'id-1')
      assert.equal(result.tx.processId, 'target-1')
      assert.deepStrictEqual(result.tx.data, raw1)
    })
})