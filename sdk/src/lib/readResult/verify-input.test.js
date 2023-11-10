import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { verifyInputWith } from './verify-input.js'

describe('verify-input', () => {
  test('should pass the values through', async () => {
    const verifyInput = verifyInputWith()

    await verifyInput({
      id: 'message-123'
    }).toPromise()
      .then(res => assert.deepStrictEqual(res, {
        id: 'message-123'
      }))

    await verifyInput({
      id: 'message-123'
    }).toPromise()
      .then(res => assert.deepStrictEqual(res, {
        id: 'message-123'
      }))
  })

  test('should reject if the values are incorrect', async () => {
    const verifyInput = verifyInputWith()

    await verifyInput({ id: 123 }).toPromise()
      .then(() => assert.fail('unreachable. Should have failed'))
      .catch(assert.ok)

    await verifyInput('message-123').toPromise()
      .then(() => assert.fail('unreachable. Should have failed'))
      .catch(assert.ok)
  })
})
