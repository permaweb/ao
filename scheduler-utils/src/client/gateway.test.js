import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { loadProcessSchedulerSchema, loadSchedulerSchema } from '../dal.js'
import { InvalidSchedulerLocationError, SchedulerTagNotFoundError } from '../err.js'
import { loadProcessSchedulerWith, loadSchedulerWith, loadProcessWith, parseHyperBeamResponse } from './gateway.js'

const GRAPHQL_URL = globalThis.GRAPHQL_URL || 'https://arweave.net/graphql'
const PROCESS = 'zc24Wpv_i6NNCEdxeKt7dcNrqL5w0hrShtSCcFGGL24'
const SCHEDULER = 'gnVg6A6S8lfB10P38V7vOia52lEhTX3Uol8kbTGUT8w'
const TWO_DAYS = 1000 * 60 * 60 * 48
const TESTNET_SU_ROUTER = 'https://su-router.ao-testnet.xyz'

const mockFetch = async (url, options) => {
  /**
   * TODO: remove eagerly checking testnet su router once
   * gateway issues have been mitigated
   */
  if (url.startsWith(TESTNET_SU_ROUTER)) {
    const [, process] = url.split('process-id=')
    if (process === 'Found') return new Response(JSON.stringify({ address: 'su-router', timestamp: new Date().getTime() }))
    return new Response('', { status: 400 })
  }

  assert.equal(url, GRAPHQL_URL)
  const body = JSON.parse(options.body)
  if (body.query.includes('GetTransactions')) return new Response(JSON.stringify(mockFetch.GetTransactions))
  if (body.query.includes('GetSchedulerLocation')) return new Response(JSON.stringify(mockFetch.GetSchedulerLocation))
  throw new Error('Not Implemented')
}

describe('gateway', () => {
  describe('loadProcessSchedulerWith', () => {
    /**
     * TODO: remove eagerly checking testnet su router once
     * gateway issues have been mitigated
     */
    test('eagerly load the su-router if found on router', async () => {
      const loadProcessScheduler = loadProcessSchedulerSchema.implement(
        loadProcessSchedulerWith({
          GRAPHQL_URL,
          fetch: mockFetch
        })
      )

      await loadProcessScheduler('Found')
        .then((res) => {
          assert.equal(res.url, TESTNET_SU_ROUTER)
          assert.equal(res.ttl, `${TWO_DAYS}`)
          assert.equal(res.address, 'su-router')
        })
    })

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

  describe('parseHyperBeamResponse', () => {
    test('parses HyperBeam response with RSA-PSS-SHA256 commitment', async () => {
      const mockProcess = {
        commitments: {
          'process-id-123': {
            type: 'rsa-pss-sha256',
            committed: ['name', 'data-protocol'],
            'original-tags': {
              tag1: { name: 'Name', value: 'TestProcess' },
              tag2: { name: 'Data-Protocol', value: 'ao' },
              tag3: { name: 'Ignore', value: 'NotCommitted' }
            }
          },
          'other-key': {
            type: 'other-type',
            committed: ['other'],
            'original-tags': {}
          }
        }
      }

      const result = parseHyperBeamResponse(mockProcess)

      assert.equal(result.id, 'process-id-123')
      assert.equal(result.tags.length, 2)
      assert.deepEqual(result.tags, [
        { name: 'Name', value: 'TestProcess' },
        { name: 'Data-Protocol', value: 'ao' }
      ])
    })

    test('handles empty commitments', async () => {
      const mockProcess = {
        commitments: {}
      }

      const result = parseHyperBeamResponse(mockProcess)

      assert.equal(result.id, undefined)
      assert.equal(result.tags.length, 0)
    })

    test('handles commitment with no committed tags', async () => {
      const mockProcess = {
        commitments: {
          'process-id-456': {
            type: 'rsa-pss-sha256',
            committed: [],
            'original-tags': {
              tag1: { name: 'Name', value: 'TestProcess' },
              tag2: { name: 'Data-Protocol', value: 'ao' }
            }
          }
        }
      }

      const result = parseHyperBeamResponse(mockProcess)

      assert.equal(result.id, 'process-id-456')
      assert.equal(result.tags.length, 0)
    })

    test('filters tags based on committed list (case insensitive)', async () => {
      const mockProcess = {
        commitments: {
          'process-id-789': {
            type: 'rsa-pss-sha256',
            committed: ['name', 'type'],
            'original-tags': {
              tag1: { name: 'Name', value: 'TestProcess' },
              tag2: { name: 'Type', value: 'Process' },
              tag3: { name: 'Data-Protocol', value: 'ao' },
              tag4: { name: 'Other', value: 'NotCommitted' }
            }
          }
        }
      }

      const result = parseHyperBeamResponse(mockProcess)

      assert.equal(result.id, 'process-id-789')
      assert.equal(result.tags.length, 2)
      assert.deepEqual(result.tags, [
        { name: 'Name', value: 'TestProcess' },
        { name: 'Type', value: 'Process' }
      ])
    })
  })

  describe('loadProcessWith', () => {
    const HB_GRAPHQL_URL = 'https://hyperbeam.example.com'

    test('loads process from HyperBeam when available', async () => {
      const mockHyperBeamResponse = {
        commitments: {
          'process-id-hb': {
            type: 'rsa-pss-sha256',
            committed: ['name', 'type'],
            'original-tags': {
              tag1: { name: 'Name', value: 'HyperBeamProcess' },
              tag2: { name: 'Type', value: 'Process' }
            }
          }
        }
      }

      const mockFetch = async (url) => {
        if (url.includes('hyperbeam.example.com')) {
          return new Response(JSON.stringify(mockHyperBeamResponse))
        }
        throw new Error('Should not call GraphQL when HyperBeam succeeds')
      }

      const loadProcess = loadProcessWith({
        fetch: mockFetch,
        HB_GRAPHQL_URL,
        GRAPHQL_URL
      })

      const result = await loadProcess('test-process')

      assert.equal(result.id, 'process-id-hb')
      assert.equal(result.tags.length, 2)
      assert.deepEqual(result.tags, [
        { name: 'Name', value: 'HyperBeamProcess' },
        { name: 'Type', value: 'Process' }
      ])
    })

    test('falls back to GraphQL when HyperBeam fails', async () => {
      const mockGraphQLResponse = {
        data: {
          transactions: {
            edges: [
              {
                node: {
                  id: 'process-id-gql',
                  tags: [
                    { name: 'Name', value: 'GraphQLProcess' },
                    { name: 'Type', value: 'Process' }
                  ]
                }
              }
            ]
          }
        }
      }

      const mockFetch = async (url) => {
        if (url.includes('hyperbeam.example.com')) {
          throw new Error('HyperBeam failed')
        }
        if (url === GRAPHQL_URL) {
          return new Response(JSON.stringify(mockGraphQLResponse))
        }
        throw new Error('Unexpected URL')
      }

      const loadProcess = loadProcessWith({
        fetch: mockFetch,
        HB_GRAPHQL_URL,
        GRAPHQL_URL
      })

      const result = await loadProcess('test-process')

      assert.equal(result.id, 'process-id-gql')
      assert.equal(result.tags.length, 2)
    })

    test('uses correct HyperBeam URL format', async () => {
      let hyperbeamUrl = ''
      const mockFetch = async (url) => {
        if (url.includes('hyperbeam.example.com')) {
          hyperbeamUrl = url
          throw new Error('Simulate HyperBeam failure to check URL format')
        }
        return new Response(JSON.stringify({ data: { transactions: { edges: [] } } }))
      }

      const loadProcess = loadProcessWith({
        fetch: mockFetch,
        HB_GRAPHQL_URL,
        GRAPHQL_URL
      })

      try {
        await loadProcess('test-process-id')
      } catch (e) {
        // Expected to fail on graphql fallback
      }

      assert.equal(hyperbeamUrl, `${HB_GRAPHQL_URL}/test-process-id/serialize~json@1.0`)
    })
  })
})
