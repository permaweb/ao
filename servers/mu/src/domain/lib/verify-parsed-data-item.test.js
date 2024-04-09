import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { verifyParsedDataItemWith } from './verify-parsed-data-item.js'

describe('verifyParsedDataItemWith', () => {
  describe('should verify the tags', () => {
    const verifyParsedDataItem = verifyParsedDataItemWith()

    test('Data-Protocol', async () => {
      await verifyParsedDataItem({
        tags: [
          { name: 'Data-Protocol', value: 'not_ao' }
        ]
      }).toPromise()
        .then(() => assert.fail('unreachable. Should have thrown'))
        .catch(err => assert.equal(err, 'Tag \'Data-Protocol\': must contain \'ao\''))
    })

    test('Type', async () => {
      await verifyParsedDataItem({
        tags: [
          { name: 'Data-Protocol', value: 'ao' },
          { name: 'Type', value: 'not_Message_or_Process' }
        ]
      }).toPromise()
        .then(() => assert.fail('unreachable. Should have thrown'))
        .catch(err => assert.equal(err, 'Tag \'Type\': must be either \'Process\' or \'Message\''))
    })
  })

  test('determine whether the data item is a Message', async () => {
    const verifyParsedDataItem = verifyParsedDataItemWith()

    await verifyParsedDataItem({
      tags: [
        { name: 'Data-Protocol', value: 'ao' },
        { name: 'Type', value: 'Message' }
      ]
    }).toPromise()
      .then(({ isMessage }) => assert.ok(isMessage))

    await verifyParsedDataItem({
      tags: [
        { name: 'Data-Protocol', value: 'ao' },
        { name: 'Type', value: 'Foo' },
        { name: 'Type', value: 'Message' },
        { name: 'Type', value: 'Process' }
      ]
    }).toPromise()
      .then(({ isMessage }) => assert.ok(isMessage))

    await verifyParsedDataItem({
      tags: [
        { name: 'Data-Protocol', value: 'ao' },
        { name: 'Type', value: 'Foo' },
        { name: 'Type', value: 'Process' }
      ]
    }).toPromise()
      .then(({ isMessage }) => assert.ok(!isMessage))

    await verifyParsedDataItem({
      tags: [
        { name: 'Data-Protocol', value: 'ao' },
        { name: 'Type', value: 'Foo' },
        { name: 'Type', value: 'Process' },
        { name: 'Type', value: 'Message' }
      ]
    }).toPromise()
      .then(({ isMessage }) => assert.ok(!isMessage))
  })
})
