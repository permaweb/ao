import { always, compose } from 'ramda'

import { withMiddleware } from './middleware/index.js'

export const withResultRoutes = app => {
  app.get(
    '/result/:interactionId',
    compose(
      withMiddleware,
      always(async (req, res) => {
        const { domain: { apis: { readState } } } = req

        const txId = req.params.interactionId

        try {
          const gatewayFetch = await fetch(`https://gateway.warp.cc/gateway/interactions/${txId}`)
          const gatewayData = await gatewayFetch.json()
          const sortkey = gatewayData.sortkey
          const contractId = gatewayData.contractid
          const txState = await readState(contractId, sortkey)
          if ('result' in txState) {
            res.send(txState.result)
          } else {
            res.send({})
          }
        } catch (e) {
          throw new Error(`Failed to read messages with error: ${e}`)
        }
      })
    )()
  )

  return app
}
