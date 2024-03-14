import { Readable } from 'node:stream'

import express from 'express'
import { DataItem } from 'warp-arbundles'

/**
 * The Reverse Proxy Configuration for an ao Messenger Unit Router
 */
export function mountMuRoutesWith ({ app, middleware }) {
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
     * Continue the request, rev proxying with a static value in order to get the route info response from a MU
     */
    return middleware({ processIdFromRequest: () => 'process' })(req, res, next)
  })

  /**
   * Since the MU receives opaque data items, we have to unpack it, to know which MU
   * to route to
   */
  app.post('/', express.raw({ type: 'application/octet-stream', limit: '10mb' }), middleware({
    processIdFromRequest: async (req) => {
      const dataItem = new DataItem(Buffer.from(req.body))

      if (!(await dataItem.isValid())) throw new InvalidDataItemError('A valid and signed data item must be provided as the body')
      /**
       * The processId is the target on a message data item
       */
      if (isMessage(dataItem)) return dataItem.target
      /**
       * The processId is the dataItem itself on a process data item
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

  app.post('/monitor/:processId', middleware({ processIdFromRequest: (req) => req.params.processId }))
  app.delete('/monitor/:processId', middleware({ processIdFromRequest: (req) => req.params.processId }))
}
