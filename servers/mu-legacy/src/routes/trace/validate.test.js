import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import validate from './validate.js'

describe('validateWrite', () => {
  test('valid input', async () => {
    const request = {
      params: { id: 'test' }
    }

    let error

    try {
      validate(request)
    } catch (e) {
      error = e
    }

    assert.strictEqual(error, undefined, 'Error was thrown for valid input')
  })

  test('missing id', async () => {
    const request = {
      params: { idWrong: 'test' }
    }

    let error

    try {
      validate(request)
    } catch (e) {
      error = e
    }

    assert.notStrictEqual(error, undefined, 'no error was thrown for invalid input')
  })

  test('missing params', async () => {
    const request = {}

    let error

    try {
      validate(request)
    } catch (e) {
      error = e
    }

    assert.notStrictEqual(error, undefined, 'no error was thrown for missing params')
  })
})
