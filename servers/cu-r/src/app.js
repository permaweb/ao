import { router } from './router.js'

/**
 * The ONLY custom bits needed for the router.
 *
 * Mount any custom endpoints, optionally reverse-proxying to the set of
 * underyling hosts with automatic failover, by using the injected revProxy handler
 */
router({
  mount: ({ app, revProxy }) => {
    app.get('/', revProxy({ processIdFromRequest: (req) => 'process' }))
    app.get('/result/:messageTxId', revProxy({ processIdFromRequest: (req) => req.query['process-id'] }))
    app.get('/state/:processId', revProxy({ processIdFromRequest: (req) => req.params.processId }))
    app.get('/cron/:processId', revProxy({ processIdFromRequest: (req) => req.params.processId }))
  }
})
