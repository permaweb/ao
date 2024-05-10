import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { loadProcessSchedulerSchema, loadSchedulerSchema } from '../dal.js'
import { InvalidSchedulerLocationError, SchedulerTagNotFoundError } from '../err.js'
import { loadProcessSchedulerWith, loadSchedulerWith } from './gateway.js'

const GRAPHQL_URL = globalThis.GRAPHQL_URL || 'https://arweave.net/graphql'
const PROCESS = 'zc24Wpv_i6NNCEdxeKt7dcNrqL5w0hrShtSCcFGGL24'
const SCHEDULER = 'gnVg6A6S8lfB10P38V7vOia52lEhTX3Uol8kbTGUT8w'
const TWO_DAYS = 1000 * 60 * 60 * 48

const mockFetch = async (url, options) => {
  assert.equal(url, GRAPHQL_URL)
  const body = JSON.parse(options.body)
  if (body.query.includes('GetTransactions')) return new Response(JSON.stringify(mockFetch.GetTransactions))
  if (body.query.includes('GetSchedulerLocation')) return new Response(JSON.stringify(mockFetch.GetSchedulerLocation))
  throw new Error('Not Implemented')
}

describe('gateway', () => {
  describe('loadProcessSchedulerWith', () => {
    test('load the Scheduler-Location for the process', async () => {
      mockFetch.GetTransactions = {
        data: {
          transactions: {
            edges: [
              {
                node: {
                  tags: [
                    {
                      name: 'Scheduler',
                      value: SCHEDULER
                    }
                  ]
                }
              }
            ]
          }
        }
      }
      mockFetch.GetSchedulerLocation = {
        data: {
          transactions: {
            edges: [
              {
                node: {
                  tags: [
                    {
                      name: 'Url',
                      value: 'https://foo.bar'
                    },
                    {
                      name: 'Time-To-Live',
                      value: `${TWO_DAYS}` // 48 hours
                    }
                  ]
                }
              }
            ]
          }
        }
      }

      const loadProcessScheduler = loadProcessSchedulerSchema.implement(
        loadProcessSchedulerWith({
          GRAPHQL_URL,
          fetch: mockFetch
        })
      )

      await loadProcessScheduler(PROCESS)
        .then((res) => {
          assert.equal(res.url, 'https://foo.bar')
          assert.equal(res.ttl, `${TWO_DAYS}`)
          assert.equal(res.address, SCHEDULER)
        })
    })

    test('throws if no Scheduler tag is found on process', async () => {
      mockFetch.GetTransactions = {
        data: {
          transactions: {
            edges: [
              {
                node: {
                  tags: [
                    {
                      name: 'Not-Scheduler',
                      value: SCHEDULER
                    }
                  ]
                }
              }
            ]
          }
        }
      }

      const loadProcessScheduler = loadProcessSchedulerSchema.implement(
        loadProcessSchedulerWith({
          GRAPHQL_URL,
          fetch: mockFetch
        })
      )

      await loadProcessScheduler(PROCESS)
        .catch((err) => assert.ok(err instanceof SchedulerTagNotFoundError))
    })
  })

  describe('loadSchedulerWith', () => {
    test('load the Scheduler-Location for the wallet address', async () => {
      mockFetch.GetSchedulerLocation = {
        data: {
          transactions: {
            edges: [
              {
                node: {
                  tags: [
                    {
                      name: 'Url',
                      value: 'https://foo.bar'
                    },
                    {
                      name: 'Time-To-Live',
                      value: `${TWO_DAYS}` // 48 hours
                    }
                  ]
                }
              }
            ]
          }
        }
      }

      const loadScheduler = loadSchedulerSchema.implement(
        loadSchedulerWith({
          GRAPHQL_URL,
          fetch: mockFetch
        })
      )

      await loadScheduler(SCHEDULER)
        .then((res) => {
          assert.equal(res.url, 'https://foo.bar')
          assert.equal(res.ttl, `${TWO_DAYS}`)
          assert.equal(res.address, SCHEDULER)
        })
    })

    test('throws if no Url tag is found on Scheduler-Location record', async () => {
      mockFetch.GetSchedulerLocation = {
        data: {
          transactions: {
            edges: [
              {
                node: {
                  tags: [
                    {
                      name: 'Not-Url',
                      value: 'https://foo.bar'
                    },
                    {
                      name: 'Time-To-Live',
                      value: `${TWO_DAYS}` // 48 hours
                    }
                  ]
                }
              }
            ]
          }
        }
      }

      const loadScheduler = loadSchedulerSchema.implement(
        loadSchedulerWith({
          GRAPHQL_URL,
          fetch: mockFetch
        })
      )

      await loadScheduler(SCHEDULER)
        .catch((err) => {
          assert.ok(err instanceof InvalidSchedulerLocationError)
          assert.equal(err.message, 'No "Url" tag found on Scheduler-Location')
        })
    })

    test('throws if no Time-To-Live tag is found on Scheduler-Location record', async () => {
      mockFetch.GetSchedulerLocation = {
        data: {
          transactions: {
            edges: [
              {
                node: {
                  tags: [
                    {
                      name: 'Url',
                      value: 'https://foo.bar'
                    },
                    {
                      name: 'Not-Time-To-Live',
                      value: `${TWO_DAYS}` // 48 hours
                    }
                  ]
                }
              }
            ]
          }
        }
      }

      const loadScheduler = loadSchedulerSchema.implement(
        loadSchedulerWith({
          GRAPHQL_URL,
          fetch: mockFetch
        })
      )

      await loadScheduler(SCHEDULER)
        .catch((err) => {
          assert.ok(err instanceof InvalidSchedulerLocationError)
          assert.equal(err.message, 'No "Time-To-Live" tag found on Scheduler-Location')
        })
    })
  })
})
