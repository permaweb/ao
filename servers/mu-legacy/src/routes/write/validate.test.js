import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import validate from './validate.js'

describe('validateWrite', () => {
  test('valid input', async () => {
    const requestBody = {
      txid: 'validTxId',
      cid: 'validCid',
      data: 'validData'
    }

    let error

    try {
      validate(requestBody)
    } catch (e) {
      error = e
    }

    assert.strictEqual(error, undefined, 'Error was thrown for valid input')
  })

  test('missing txid', async () => {
    const requestBody = {
      cid: 'validCid',
      data: 'validData'
    }

    let error

    try {
      validate(requestBody)
    } catch (e) {
      error = e
    }

    assert.notStrictEqual(error, undefined, 'No error was thrown for missing txid')
  })

  test('missing data', async () => {
    const requestBody = {
      cid: 'validCid',
      txid: 'validData'
    }

    let error

    try {
      validate(requestBody)
    } catch (e) {
      error = e
    }

    assert.notStrictEqual(error, undefined, 'No error was thrown for missing data')
  })
})
