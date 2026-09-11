import { describe, test } from 'node:test'
import * as assert from 'node:assert'
import { spawnWith } from './ao-core.js'

// Unit tests for mainnet spawn param-building — no live node. A fake `deps`
// captures the params the client would POST.
const makeDeps = () => {
  const captured = {}
  return {
    captured,
    scheduler: 'SCHED_ADDR',
    aoCore: {
      request: async (params) => {
        captured.params = params
        return { headers: { get: (k) => (k === 'process' ? 'PID123' : null) } }
      }
    }
  }
}

describe('mainnet spawn: execution-device override', () => {
  test('defaults to genesis-wasm@1.0 when not provided', async () => {
    const deps = makeDeps()
    await spawnWith(deps)({ module: 'MODTX' })
    assert.equal(deps.captured.params['execution-device'], 'genesis-wasm@1.0')
  })

  test('honors args.executionDevice', async () => {
    const deps = makeDeps()
    await spawnWith(deps)({ module: 'MODTX', executionDevice: 'lua@5.3a' })
    assert.equal(deps.captured.params['execution-device'], 'lua@5.3a')
  })

  test('honors EXECUTION_DEVICE env', async () => {
    const prev = process.env.EXECUTION_DEVICE
    process.env.EXECUTION_DEVICE = 'lua@5.3a'
    try {
      const deps = makeDeps()
      await spawnWith(deps)({ module: 'MODTX' })
      assert.equal(deps.captured.params['execution-device'], 'lua@5.3a')
    } finally {
      if (prev === undefined) delete process.env.EXECUTION_DEVICE
      else process.env.EXECUTION_DEVICE = prev
    }
  })
})

describe('mainnet spawn: non-string module is rejected', () => {
  test('throws on a map-valued module instead of "[object Object]"', async () => {
    const deps = makeDeps()
    await assert.rejects(
      () => spawnWith(deps)({ module: { 'content-type': 'application/lua', body: 'x' } }),
      /module must be a transaction-id string/
    )
    assert.equal(deps.captured.params, undefined, 'request must not be sent for a bad module')
  })

  test('still spawns for a valid string module', async () => {
    const deps = makeDeps()
    const pid = await spawnWith(deps)({ module: 'MODTX' })
    assert.equal(pid, 'PID123')
    assert.equal(deps.captured.params.Module, 'MODTX')
  })
})
