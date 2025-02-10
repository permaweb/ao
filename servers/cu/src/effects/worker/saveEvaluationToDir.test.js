/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import assert from 'node:assert'

import { createTestLogger } from '../../domain/logger.js'
import { saveEvaluationToDirWith } from './saveEvaluationToDir.js'


const logger = createTestLogger({ name: 'ao-cu:worker' })


describe('saveEvaluationToDir', async () => {
    describe('saveEvaluationToDirWith', async () => {
        test('File exists (exit)', async () => {
            let existsSyncCalled = false
            let writeFileSyncCalled = false
            const saveEvaluationToDir = saveEvaluationToDirWith({
                EVALUATION_RESULT_DIR: 'test-directory',
                existsSync: (path) => {
                    existsSyncCalled = true
                    assert.equal(path, 'test-directory/test-process-id-test-message-id.json')
                    return true
                },
                writeFileSync: (path, data) => {
                    writeFileSyncCalled = true
                    assert.fail('writeFileSync should not be called')
                },
                logger
            })
            const result = await saveEvaluationToDir({
                messageId: 'test-message-id',
                processId: 'test-process-id',
                output: { foo: 'bar' }
            })
            assert.deepStrictEqual(result, { foo: 'bar' })
            assert.ok(existsSyncCalled)
            assert.ok(!writeFileSyncCalled)
        })

        test('File does not exist (write)', async () => {
            let existsSyncCalled = false
            let writeFileSyncCalled = false
            const saveEvaluationToDir = saveEvaluationToDirWith({
                EVALUATION_RESULT_DIR: 'test-directory',
                existsSync: (path) => {
                    existsSyncCalled = true
                    assert.equal(path, 'test-directory/test-process-id-test-message-id.json')
                    return false
                },
                writeFileSync: (path, data) => {
                    writeFileSyncCalled = true
                    assert.equal(path, 'test-directory/test-process-id-test-message-id.json')
                    assert.equal(data, JSON.stringify({ foo: 'bar' }))
                },
                logger
            })
            const result = await saveEvaluationToDir({
                messageId: 'test-message-id',
                processId: 'test-process-id',
                output: { foo: 'bar' }
            })
            assert.deepStrictEqual(result, { foo: 'bar' })
            assert.ok(existsSyncCalled)
            assert.ok(writeFileSyncCalled)
        })
    })
})
