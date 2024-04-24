import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { verifyInputWith } from './verify-input.js'

describe('verify-input', () => {
  test('should pass the values through', async () => {
    const verifyInput = verifyInputWith()

    await verifyInput({
      process: 'process-123',
      from: '1',
      to: '2',
      limit: 1
    }).toPromise()
      .then(res => assert.deepStrictEqual(res, {
        process: 'process-123',
        from: '1',
        to: '2',
        limit: 1
      }))
  })

  test('should reject if the values are incorrect', async () => {
    const verifyInput = verifyInputWith()

    await verifyInput({ process: 123 }).toPromise()
      .then(() => assert.fail('unreachable. Should have failed'))
      .catch(assert.ok)

    await verifyInput('message-123').toPromise()
      .then(() => assert.fail('unreachable. Should have failed'))
      .catch(assert.ok)

    await verifyInput({ id: 'message-123', process: 123 }).toPromise()
      .then(() => assert.fail('unreachable. Should have failed'))
      .catch(assert.ok)
  })
})
