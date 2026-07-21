import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { messageWith, resultWith, resultsWith, spawnWith } from './ao-core.js'

function responseWith (body, headers = {}) {
  return {
    ok: true,
    headers: {
      get: (name) => headers[name] ?? headers[name.toLowerCase()] ?? null
    },
    json: async () => body,
    text: async () => String(body)
  }
}

function createMessage (body, headers) {
  return messageWith({
    aoCore: {
      request: async () => responseWith(body, headers)
    }
  })
}

describe('ao-core message', () => {
  test('returns the assignment slot by default', async () => {
    const message = createMessage({ slot: 42, id: 'message-123' })

    const res = await message({ process: 'process-asdf' })

    assert.equal(res, 42)
  })

  test('returns the message id when returnMessageId is true', async () => {
    const message = createMessage({ slot: 42, id: 'message-123' })

    const res = await message({
      process: 'process-asdf',
      returnMessageId: true
    })

    assert.equal(res, 'message-123')
  })

  test('returns slot and id when returnAssignmentSlot and returnMessageId are true', async () => {
    const message = createMessage({ slot: 42, id: 'message-123' })

    const res = await message({
      process: 'process-asdf',
      returnAssignmentSlot: true,
      returnMessageId: true
    })

    assert.deepStrictEqual(res, {
      slot: 42,
      id: 'message-123'
    })
  })
})

function createSpawn () {
  const requests = []
  const deps = {
    scheduler: 'scheduler-123',
    aoCore: {
      request: async (params) => {
        requests.push(params)
        return responseWith({}, { process: 'process-123' })
      }
    }
  }
  const spawn = spawnWith(deps)

  return { deps, requests, spawn }
}

describe('ao-core spawn', () => {
  test('uses the genesis WASM execution device by default', async () => {
    const { requests, spawn } = createSpawn()

    const processId = await spawn({
      module: 'module-123',
      tags: [{ name: 'Custom-Tag', value: 'unchanged' }]
    })

    assert.equal(processId, 'process-123')
    assert.equal(requests[0]['execution-device'], 'genesis-wasm@1.0')
    assert.equal(requests[0].Module, 'module-123')
    assert.equal(requests[0]['Custom-Tag'], 'unchanged')
    assert.equal('custom-tag' in requests[0], false)
  })

  test('spawns a Lua process from a module transaction', async () => {
    const { requests, spawn } = createSpawn()

    await spawn({
      executionDevice: 'lua@5.3',
      module: 'lua-module-123'
    })

    assert.equal(requests[0]['execution-device'], 'lua@5.3a')
    assert.equal(requests[0].module, 'lua-module-123')
    assert.equal('Module' in requests[0], false)
  })

  test('spawns a Lua process from inline source', async () => {
    const { requests, spawn } = createSpawn()
    const source = 'function compute(process) return process end'

    await spawn({
      executionDevice: 'lua@5.3a',
      data: source,
      tags: [{ name: 'Content-Type', value: 'text/plain' }]
    })

    assert.equal(requests[0]['execution-device'], 'lua@5.3a')
    assert.equal(requests[0].data, source)
    assert.equal(requests[0]['content-type'], 'application/lua')
    assert.equal('Module' in requests[0], false)
  })

  test('supports the hyper-aos type alias', async () => {
    const { requests, spawn } = createSpawn()

    await spawn({ type: 'hyper-aos', module: 'lua-module-123' })

    assert.equal(requests[0]['execution-device'], 'lua@5.3a')
  })

  test('normalizes an execution device supplied as a tag', async () => {
    const { requests, spawn } = createSpawn()

    await spawn({
      data: 'function compute(process) return process end',
      tags: [{ name: 'Execution-Device', value: 'lua@5.3' }]
    })

    assert.equal(requests[0]['execution-device'], 'lua@5.3a')
    assert.equal('Execution-Device' in requests[0], false)
    assert.equal(requests[0]['content-type'], 'application/lua')
  })

  test('lowercases Lua process tags and subsequent Lua message tags', async () => {
    const { deps, requests, spawn } = createSpawn()
    const message = messageWith(deps)

    await spawn({
      executionDevice: 'lua@5.3',
      data: 'function compute(process) return process end',
      tags: [{ name: 'Custom-Tag', value: 'spawn' }]
    })
    await message({
      process: 'process-123',
      data: 'hello',
      tags: [{ name: 'Action', value: 'Ping' }]
    })

    assert.equal(requests[0].authority, 'scheduler-123')
    assert.equal(requests[0].scheduler, 'scheduler-123')
    assert.equal(requests[0]['custom-tag'], 'spawn')
    assert.equal(requests[0].type, 'Process')
    assert.equal(requests[0]['data-protocol'], 'ao')
    assert.equal(requests[0].variant, 'ao.N.1')
    assert.equal('Authority' in requests[0], false)
    assert.equal('Type' in requests[0], false)

    assert.equal(requests[1].action, 'Ping')
    assert.equal(requests[1].type, 'Message')
    assert.equal(requests[1]['data-protocol'], 'ao')
    assert.equal(requests[1].variant, 'ao.N.1')
    assert.equal(requests[1].accept, 'application/json')
    assert.equal(requests[1]['require-codec'], 'application/json')
    assert.equal('Action' in requests[1], false)
    assert.equal('Type' in requests[1], false)
  })

  test('lowercases message tags when Lua is specified after reconnecting', async () => {
    const requests = []
    const message = messageWith({
      aoCore: {
        request: async (params) => {
          requests.push(params)
          return responseWith({ slot: 1 })
        }
      }
    })

    await message({
      process: 'process-123',
      executionDevice: 'lua@5.3',
      tags: [{ name: 'Action', value: 'Ping' }]
    })

    assert.equal(requests[0].action, 'Ping')
    assert.equal(requests[0].type, 'Message')
    assert.equal('Action' in requests[0], false)
  })

  test('requires either a module or inline source for Lua', async () => {
    const { spawn } = createSpawn()

    await assert.rejects(
      spawn({ executionDevice: 'lua@5.3' }),
      /No module or inline Lua source provided/
    )
  })
})

describe('ao-core results', () => {
  test('places the requested slot on compute before selecting results', async () => {
    const requests = []
    const result = resultWith({
      aoCore: {
        request: async (params) => {
          requests.push(params)
          return responseWith({ output: { body: 'ok' } })
        }
      }
    })

    const res = await result({ process: 'process-123', message: 7 })

    assert.equal(
      requests[0].path,
      '/process-123~process@1.0/compute=7/results'
    )
    assert.deepStrictEqual(res.Output, { body: 'ok' })
  })

  test('uses the current slot when listing process results', async () => {
    const requests = []
    const results = resultsWith({
      aoCore: {
        request: async (params) => {
          requests.push(params)
          if (requests.length === 1) return responseWith(7)
          return responseWith({ output: { body: 'ok' } })
        }
      }
    })

    const res = await results({ process: 'process-123' })

    assert.equal(requests[0].path, '/process-123/slot/current')
    assert.equal(requests[1].path, '/process-123/compute=7/results')
    assert.equal(res.edges[0].cursor, '7')
    assert.deepStrictEqual(res.edges[0].node.Output, { body: 'ok' })
  })

  test('unwraps raw and legacy result envelopes', async () => {
    const rawResult = resultWith({
      aoCore: {
        request: async () => responseWith({ raw: { output: { body: 1 } } })
      }
    })
    const legacyResult = resultWith({
      aoCore: {
        request: async () => responseWith({ results: { raw: { output: { body: 2 } } } })
      }
    })

    assert.equal((await rawResult({ process: 'process-123', message: 1 })).Output.body, 1)
    assert.equal((await legacyResult({ process: 'process-123', message: 2 })).Output.body, 2)
  })
})
