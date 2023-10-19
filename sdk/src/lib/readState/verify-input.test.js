import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { verifyInputWith } from './verify-input.js'

describe('verify-input', () => {
  test('should pass the values through', async () => {
    const verifyInput = verifyInputWith()

    await verifyInput({
      id: 'process-123',
      sortKey: 'sort-key-123'
    }).toPromise()
      .then(res => assert.deepStrictEqual(res, {
        id: 'process-123',
        sortKey: 'sort-key-123'
      }))

    await verifyInput({
      id: 'process-123'
    }).toPromise()
      .then(res => assert.deepStrictEqual(res, {
        id: 'process-123'
      }))
  })

  test('should reject if the values are incorrect', async () => {
    const verifyInput = verifyInputWith()

    await verifyInput({ id: 123 }).toPromise()
      .then(() => assert('unreachable. Should have failed'))
      .catch(assert.ok)

    await verifyInput({ id: 'process-123', sortKey: 123 }).toPromise()
      .then(() => assert('unreachable. Should have failed'))
      .catch(assert.ok)

    await verifyInput('process-123').toPromise()
      .then(() => assert('unreachable. Should have failed'))
      .catch(assert.ok)
  })
})
