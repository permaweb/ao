/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import assert from 'node:assert'

import { createTestLogger } from '../../domain/logger.js'
import { dumpEvaluationsWith } from './dumpEvaluations.js'

const logger = createTestLogger({ name: 'ao-cu:worker' })

describe('dumpEvaluations', async () => {
  describe('dumpEvaluationsWith', async () => {
    test('AWS Credentials not set', async () => {
      const dumpEvaluations = dumpEvaluationsWith({
        EVALUATION_RESULT_DIR: './test/evaluation-results',
        EVALUATION_RESULT_BUCKET: 'test-bucket'
      })
      const result = await dumpEvaluations('test-process-id')
      assert.strictEqual(result, 'AWS Credentials not set')
    })

    test('Correct glob path', async () => {
      let globCalled = false
      const dumpEvaluations = dumpEvaluationsWith({
        EVALUATION_RESULT_DIR: 'test-dir/',
        EVALUATION_RESULT_BUCKET: 'test-bucket',
        AWS_ACCESS_KEY_ID: 'test-access-key-id',
        AWS_SECRET_ACCESS_KEY: 'test-secret-access-key',
        AWS_REGION: 'test-region',
        globSync: (path) => {
          globCalled = true
          assert.strictEqual(path, 'test-dir/test-process-id**.json')
          return []
        },
        uploadFileToS3With: async () => null,
        logger
      })
      await dumpEvaluations('test-process-id')
      assert.ok(globCalled)
    })

    test('Upload file to S3', async () => {
      let globCalled = false
      let uploadFileToS3Called = false
      const dumpEvaluations = dumpEvaluationsWith({
        EVALUATION_RESULT_DIR: 'test-dir/',
        EVALUATION_RESULT_BUCKET: 'test-bucket',
        AWS_ACCESS_KEY_ID: 'test-access-key-id',
        AWS_SECRET_ACCESS_KEY: 'test-secret-access-key',
        AWS_REGION: 'test-region',
        globSync: (path) => {
          globCalled = true
          assert.strictEqual(path, 'test-dir/test-process-id**.json')
          return ['test-dir/test-process-id-test-message-1.json', 'test-dir/test-process-id-test-message-2.json']
        },
        uploadFileToS3With: () => {
          uploadFileToS3Called = true
          let i = 1
          return async (file, bucket, key) => {
            assert.strictEqual(file, `test-dir/test-process-id-test-message-${i}.json`)
            assert.strictEqual(bucket, 'test-bucket')
            assert.strictEqual(key, `test-process-id-test-message-${i}.json`)
            i++
          }
        },
        logger
      })
      await dumpEvaluations('test-process-id')
      assert.ok(globCalled)
      assert.ok(uploadFileToS3Called)
    })
  })
})
