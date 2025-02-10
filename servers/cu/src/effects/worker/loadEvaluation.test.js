/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import assert from 'node:assert'

import { createTestLogger } from '../../domain/logger.js'
import { loadEvaluationFromDirWith, loadEvaluationFromS3With, loadEvaluationWith } from './loadEvaluation.js'


const logger = createTestLogger({ name: 'ao-cu:worker' })


describe('loadEvaluation', async () => {
    describe('loadEvaluationWith', async () => {
        test('Correct file name, file exists', async () => {
            let existsCalled = false
            let loadFromDirCalled = false
            const loadEvaluation = loadEvaluationWith({
                EVALUATION_RESULT_DIR: 'test-directory',
                EVALUATION_RESULT_BUCKET: 'test-bucket',
                AWS_ACCESS_KEY_ID: 'test-access-key-id',
                AWS_SECRET_ACCESS_KEY: 'test-secret-access-key',
                AWS_REGION: 'test-region',
                logger,
                existsSync: (path) => {
                    existsCalled = true
                    assert.equal(path, 'test-directory/test-process-id-test-message-id.json')
                    return true
                },
                writeFileSync: () => {
                    assert.fail('writeFileSync should not be called')
                },
                loadEvaluationFromDir: async ({ fileName }) => {
                    loadFromDirCalled = true                    
                    assert.equal(fileName, 'test-directory/test-process-id-test-message-id.json')
                    return { foo: 'bar' }
                },
                loadEvaluationFromS3: async () => {
                    assert.fail('loadEvaluationFromS3 should not be called')
                }
            })
            const result = await loadEvaluation({
                messageId: 'test-message-id',
                processId: 'test-process-id'
            })
            assert.deepStrictEqual(result, { foo: 'bar' })
            assert.strictEqual(existsCalled, true)
            assert.strictEqual(loadFromDirCalled, true)
        })

        test('AWS Credentials not set', async () => {
            const loadEvaluation = loadEvaluationWith({
                EVALUATION_RESULT_DIR: './test/evaluation-results',
                EVALUATION_RESULT_BUCKET: 'test-bucket',
                AWS_ACCESS_KEY_ID: null,
                AWS_SECRET_ACCESS_KEY: null,
                AWS_REGION: null,
                existsSync: () => false,
                writeFileSync: () => {},
                loadEvaluationFromDir: async () => null,
                loadEvaluationFromS3: async () => null,
                logger
            })
            const result = await loadEvaluation({
                messageId: 'test-message-id',
                processId: 'test-process-id'
            })
            assert.strictEqual(result, 'AWS Credentials not set')
        })

        test('File does not exist', async () => {
            let existsCalled = false
            let writeFileSyncCalled = false
            const loadEvaluation = loadEvaluationWith({
                EVALUATION_RESULT_DIR: 'test-directory',
                EVALUATION_RESULT_BUCKET: 'test-bucket',
                AWS_ACCESS_KEY_ID: 'test-access-key-id',
                AWS_SECRET_ACCESS_KEY: 'test-secret-access-key',
                AWS_REGION: 'test-region',
                logger,
                existsSync: (path) => {
                    existsCalled = true
                    assert.equal(path, 'test-directory/test-process-id-test-message-id.json')
                    return false
                },
                writeFileSync: (path, data ) => {
                    writeFileSyncCalled = true
                    assert.equal(path, 'test-directory/test-process-id-test-message-id.json')
                    assert.equal(data, JSON.stringify({ foo: 'bar' }))
                },
                loadEvaluationFromDir: async () => {
                    assert.fail('loadEvaluationFromDir should not be called')
                },
                loadEvaluationFromS3: async ({ fileName }) => {
                    assert.equal(fileName, 'test-directory/test-process-id-test-message-id.json')
                    return { foo: 'bar' }
                }
            })
            const result = await loadEvaluation({
                messageId: 'test-message-id',
                processId: 'test-process-id'
            })
            assert.deepStrictEqual(result, { foo: 'bar' })
            assert.strictEqual(existsCalled, true)
        })
    })

    describe('loadEvaluationFromDirWith', async () => {
        test('Load from dir', async () => {
            let readCalled = false
            const loadEvaluationFromDir = loadEvaluationFromDirWith({
                logger,
                readFileSync: (path, encoding) => {
                    readCalled = true
                    assert.equal(path, 'test-directory/test-process-id-test-message-id.json')
                    assert.equal(encoding, 'utf8')
                    return JSON.stringify({ foo: 'bar' })
                }
            })
            const result = await loadEvaluationFromDir({
                fileName: 'test-directory/test-process-id-test-message-id.json'
            })
            assert.deepStrictEqual(result, { foo: 'bar' })
            assert.strictEqual(readCalled, true)
        })
    })

    describe('loadEvaluationFromS3With', async () => {
        test('Load from S3', async () => {
            let getFileFromS3Called = false
            const loadEvaluationFromS3 = loadEvaluationFromS3With({ 
                EVALUATION_RESULT_BUCKET: 'test-bucket',
                AWS_ACCESS_KEY_ID: 'test-access-key-id',
                AWS_SECRET_ACCESS_KEY: 'test-secret-access-key',
                AWS_REGION: 'test-region',
                logger,
                getFileFromS3With: (bucketName, s3Client) => {
                    getFileFromS3Called = true  
                    assert.equal(bucketName, 'test-bucket')
                    return async (fileName) => {
                        assert.equal(fileName, 'test-directory/test-process-id-test-message-id.json')
                        return JSON.stringify({ foo: 'bar' })
                    }
                }
            })
            const result = await loadEvaluationFromS3({
                fileName: 'test-directory/test-process-id-test-message-id.json'
            })
            assert.deepStrictEqual(result, { foo: 'bar' })
            assert.strictEqual(getFileFromS3Called, true)
        })
    })
})
