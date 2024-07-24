import { describe, test } from 'node:test'
import * as assert from 'node:assert'
import { trimSlash } from './utils.js'

describe('trimSlash', () => {
  test('should remove trailing slash from url', () => {
    const resultWithTrailingSlash = trimSlash('https://foo.bar/')
    assert.equal(resultWithTrailingSlash, 'https://foo.bar')
    const resultWithoutTrailingSlash = trimSlash('https://foo.bar')
    assert.equal(resultWithoutTrailingSlash, 'https://foo.bar')
  })
})
