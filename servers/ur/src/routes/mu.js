import { PassThrough, Readable } from 'node:stream'

import express from 'express'
import { DataItem } from 'arbundles'

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

  app.post('/',
    (req, res, next) => {
      if (req.query.assign) {
        /**
         * This flag is used in subsequent steps to branch
         * (see below)
         */
        req.isAssignment = true
        return next()
      }

      return express.raw({ type: 'application/octet-stream', limit: '10mb' })(req, res, next)
    },
    middleware({
      processIdFromRequest: async (req) => {
        /**
         * This request is an assignment, so there is no reason
         * to consume the body in order to extract the processId
         *
         * as it is instead available as query parameter
         */
        if (req.isAssignment) return req.query['process-id']

        /**
         * Since the MU receives opaque data items, the only place to extract the process id is
         * the data item itself. So we first parse and validate the data item, then extract the process id
         * based on the data item type.
         */
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
      restreamBody: (req) => req.isAssignment ? new PassThrough().end() : Readable.from(req.body)
    }))

  app.post('/monitor/:processId', middleware({ processIdFromRequest: (req) => req.params.processId }))
  app.delete('/monitor/:processId', middleware({ processIdFromRequest: (req) => req.params.processId }))
}
