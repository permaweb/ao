import { describe, test } from 'node:test'
import * as assert from 'node:assert'
import { getProcessWith } from './getProcess.js'

describe('getProcessWith', () => {
  test('should return a function when called', () => {
    const mockGetProcess = async () => ({ process: 'mock-process' })
    const mockCache = {
      getProcessResponse: async () => null,
      setProcessResponse: async () => {}
    }

    const result = getProcessWith({ getProcess: mockGetProcess, cache: mockCache })

    assert.equal(typeof result, 'function')
  })

  test('should return cached response when available', async () => {
    const cachedResponse = { process: 'cached-process' }
    const mockGetProcess = async () => ({ process: 'fresh-process' })
    const mockCache = {
      getProcessResponse: async (processId) => {
        assert.equal(processId, 'test-process-id')
        return cachedResponse
      },
      setProcessResponse: async () => {}
    }

    const getProcessFn = getProcessWith({ getProcess: mockGetProcess, cache: mockCache })
    const result = await getProcessFn('test-process-id')

    assert.deepEqual(result, cachedResponse)
  })

  test('should fetch fresh data when cache is empty', async () => {
    const freshResponse = { process: 'fresh-process' }
    const mockGetProcess = async (processId) => {
      assert.equal(processId, 'test-process-id')
      return freshResponse
    }
    const mockCache = {
      getProcessResponse: async () => null,
      setProcessResponse: async (processId, response, ttl) => {
        assert.equal(processId, 'test-process-id')
        assert.deepEqual(response, freshResponse)
        assert.equal(ttl, 6000)
      }
    }

    const getProcessFn = getProcessWith({ getProcess: mockGetProcess, cache: mockCache })
    const result = await getProcessFn('test-process-id')

    assert.deepEqual(result, freshResponse)
  })

  test('should cache fresh data with 6000ms TTL', async () => {
    let setCacheCallCount = 0
    const freshResponse = { process: 'fresh-process' }
    const mockGetProcess = async () => freshResponse
    const mockCache = {
      getProcessResponse: async () => null,
      setProcessResponse: async (processId, response, ttl) => {
        setCacheCallCount++
        assert.equal(processId, 'test-process-id')
        assert.deepEqual(response, freshResponse)
        assert.equal(ttl, 6000)
      }
    }

    const getProcessFn = getProcessWith({ getProcess: mockGetProcess, cache: mockCache })
    await getProcessFn('test-process-id')

    assert.equal(setCacheCallCount, 1)
  })

  test('should handle getProcess errors', async () => {
    const expectedError = new Error('Failed to get process')
    const mockGetProcess = async () => {
      throw expectedError
    }
    const mockCache = {
      getProcessResponse: async () => null,
      setProcessResponse: async () => {}
    }

    const getProcessFn = getProcessWith({ getProcess: mockGetProcess, cache: mockCache })

    await assert.rejects(
      () => getProcessFn('test-process-id'),
      expectedError
    )
  })

  test('should handle cache getProcessResponse errors', async () => {
    const expectedError = new Error('Cache read error')
    const mockGetProcess = async () => ({ process: 'fresh-process' })
    const mockCache = {
      getProcessResponse: async () => {
        throw expectedError
      },
      setProcessResponse: async () => {}
    }

    const getProcessFn = getProcessWith({ getProcess: mockGetProcess, cache: mockCache })

    await assert.rejects(
      () => getProcessFn('test-process-id'),
      expectedError
    )
  })

  test('should handle cache setProcessResponse errors gracefully', async () => {
    const freshResponse = { process: 'fresh-process' }
    const mockGetProcess = async () => freshResponse
    const mockCache = {
      getProcessResponse: async () => null,
      setProcessResponse: async () => {
        throw new Error('Cache write error')
      }
    }

    const getProcessFn = getProcessWith({ getProcess: mockGetProcess, cache: mockCache })

    await assert.rejects(
      () => getProcessFn('test-process-id'),
      (error) => error.message === 'Cache write error'
    )
  })

  test('should work with different process IDs', async () => {
    const responses = {
      'process-1': { process: 'response-1' },
      'process-2': { process: 'response-2' }
    }

    const mockGetProcess = async (processId) => responses[processId]
    const mockCache = {
      getProcessResponse: async () => null,
      setProcessResponse: async () => {}
    }

    const getProcessFn = getProcessWith({ getProcess: mockGetProcess, cache: mockCache })

    const result1 = await getProcessFn('process-1')
    const result2 = await getProcessFn('process-2')

    assert.deepEqual(result1, responses['process-1'])
    assert.deepEqual(result2, responses['process-2'])
  })
})
