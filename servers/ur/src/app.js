import { Readable } from 'node:stream'
import express from 'express'
import WarpArBundles from 'warp-arbundles'

import { router } from './router.js'

const { DataItem } = WarpArBundles

/**
 * The ONLY custom bits needed for the router.
 *
 * Mount any custom endpoints, optionally reverse-proxying to the set of
 * underyling hosts with automatic failover, by using the injected revProxy handler
 */

/**
 * The Reverse Proxy Configuration for an ao Compute Unit Router
 */
function aoComputeUnitMount ({ app, revProxy }) {
  app.get('/', revProxy({ processIdFromRequest: (req) => 'process' }))
  app.get('/result/:messageTxId', revProxy({ processIdFromRequest: (req) => req.query['process-id'] }))
  app.get('/state/:processId', revProxy({ processIdFromRequest: (req) => req.params.processId }))
  app.get('/cron/:processId', revProxy({ processIdFromRequest: (req) => req.params.processId }))
}

/**
 * The Reverse Proxy Configuration for an ao Messenger Unit Router
 */
function aoMessengerUnitMount ({ app, revProxy }) {
  class InvalidDataItemError extends Error {
    constructor (...args) {
      super(...args)
      this.status = 422
    }
  }

  const isTagEqualTo = ({ name, value }) => (tag) => tag.name === name && tag.value === value
  const isMessage = (dataItem) => !!dataItem.tags.find(isTagEqualTo({ name: 'Type', value: 'Message' }))
  const isProcess = (dataItem) => !!dataItem.tags.find(isTagEqualTo({ name: 'Type', value: 'Process' }))

  app.get('/', (req, res, next) => {
    if (req.query.debug) return res.status(501).send('MU Tracing not implemented on the Router')

    /**
     * Continue the request, rev proxying with a static value in order to get the roout info response from a MU
     */
    return revProxy({ processIdFromRequest: () => 'process' })(req, res, next)
  })

  /**
   * Since the MU receives opaque data items, we have to unpack it, to know which MU
   * to route to
   */
  app.post('/', express.raw({ type: 'application/octet-stream', limit: '10mb' }), revProxy({
    processIdFromRequest: async (req) => {
      const dataItem = new DataItem(Buffer.from(req.body))

      if (!(await dataItem.isValid())) throw new InvalidDataItemError('A valid and signed data item must be provided as the body')
      /**
       * The processId is the target on a message data item
       */
      if (isMessage(dataItem)) return dataItem.target
      /**
       * The processId is the dataItem itseld on a process data item
       */
      if (isProcess(dataItem)) return dataItem.id

      throw new InvalidDataItemError('Could not determine ao type of DataItem based on tag \'Type\'')
    },
    /**
     * Since we consumed the request stream in order to parse the data item and
     * determine the processId, we must provide a new request stream, to be sent
     * as the body on proxied request
     */
    restreamBody: (req) => Readable.from(req.body)
  }))

  app.post('/monitor/:processId', revProxy({ processIdFromRequest: (req) => req.params.processId }))
  app.delete('/monitor/:processId', revProxy({ processIdFromRequest: (req) => req.params.processId }))
}

router({ cu: aoComputeUnitMount, mu: aoMessengerUnitMount })
