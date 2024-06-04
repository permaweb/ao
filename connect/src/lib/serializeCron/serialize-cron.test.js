import { serializeCron } from './index.js'
import { describe, test } from 'node:test'
import * as assert from 'node:assert'

describe('serializeCron', () => {
  describe('should throw error if incorrect cron data', () => {
    describe('should throw error if interval is incorrect', () => {
      test('should throw error if interval is non-string', () => {
        let errorCaught = false
        const cronWrongInterval = {
          interval: 10,
          tags: [
            { name: 'foo', value: 'bar' }
          ]
        }
        try {
          serializeCron(cronWrongInterval)
        } catch (e) {
          errorCaught = true
          assert.equal(e.message, 'Encountered Error serializing cron: invalid interval')
        }

        assert.ok(errorCaught)
      })

      test('should throw error if interval is in wrong format', () => {
        let errorCaught = false
        const cronWrongInterval = {
          interval: '10minutes',
          tags: [
            { name: 'foo', value: 'bar' }
          ]
        }
        try {
          serializeCron(cronWrongInterval)
        } catch (e) {
          errorCaught = true
          assert.equal(e.message, 'Encountered Error serializing cron: invalid interval')
        }

        assert.ok(errorCaught)
      })

      test('should throw error if interval is plural and value is one', () => {
        let errorCaught = false
        const cronWrongInterval = {
          interval: '1-minutes',
          tags: [
            { name: 'foo', value: 'bar' }
          ]
        }
        try {
          serializeCron(cronWrongInterval)
        } catch (e) {
          errorCaught = true
          assert.equal(e.message, 'Encountered Error serializing cron: invalid interval type')
        }

        assert.ok(errorCaught)
      })
    })

    describe('should throw error if tags are incorrect', () => {
      test('tags have non-string value', () => {
        let errorCaught = false
        const cronWrongTags = {
          interval: '10-minutes',
          tags: [
            { name: 'Amount', value: 1000 }
          ]
        }

        try {
          serializeCron(cronWrongTags)
        } catch (e) {
          errorCaught = true
          assert.equal(e.message, 'Encountered Error serializing cron: invalid interval tag types')
        }

        assert.ok(errorCaught)
      })

      test('tags are missing keys', () => {
        let errorCaught = false
        const cronWrongTagNoValue = {
          interval: '10-minutes',
          tags: [
            { name: 'Amount' }
          ]
        }
        try {
          serializeCron(cronWrongTagNoValue)
        } catch (e) {
          errorCaught = true
          assert.equal(e.message, 'Encountered Error serializing cron: invalid tag structure')
        }

        assert.ok(errorCaught)
      })
    })
  })
  describe('should returns serialized tags if correct cron data', () => {
    test('valid tags, plural interval', () => {
      const cron = {
        interval: '10-minutes',
        tags: [
          { name: 'Foo', value: 'bar' },
          { name: 'Bar', value: 'foo' }
        ]
      }
      const tags = [
        { name: 'Cron-Interval', value: '10-minutes' },
        { name: 'Cron-Tag-Foo', value: 'bar' },
        { name: 'Cron-Tag-Bar', value: 'foo' }
      ]
      const serializedTags = serializeCron(cron)

      assert.deepStrictEqual(serializedTags, tags)
    })

    test('valid tags, singular interval', () => {
      const cron = {
        interval: '1-hour',
        tags: [
          { name: 'Foo', value: 'bar' },
          { name: 'Bar', value: 'foo' }
        ]
      }
      const tags = [
        { name: 'Cron-Interval', value: '1-hour' },
        { name: 'Cron-Tag-Foo', value: 'bar' },
        { name: 'Cron-Tag-Bar', value: 'foo' }
      ]
      const serializedTags = serializeCron(cron)

      assert.deepStrictEqual(serializedTags, tags)
    })
  })
})
