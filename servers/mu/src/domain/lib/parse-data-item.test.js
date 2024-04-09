import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../logger.js'
import { parseDataItemWith } from './parse-data-item.js'

const logger = createLogger('ao-mu:processMsg')

describe('parseDataItem', () => {
  test('parse data item into tx object', async () => {
    const raw1 = Buffer.alloc(0)
    const item1 = {
      id: Promise.resolve('id-1'),
      signature: 'foobar',
      owner: 'owner-1',
      target: 'target-1',
      anchor: 'foobar',
      tags: [
        { name: 'Foo', value: 'Bar' }
      ]
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

    assert.deepStrictEqual(result.dataItem, {
      id: 'id-1',
      signature: 'foobar',
      owner: 'owner-1',
      target: 'target-1',
      anchor: 'foobar',
      tags: [
        { name: 'Foo', value: 'Bar' }
      ]
    })
  })
})
