/**
 * The Reverse Proxy Configuration for an ao Compute Unit Router
 */
export function mountCuRoutesWith ({ app, middleware }) {
  app.get('/', middleware({ processIdFromRequest: () => 'process' }))
  app.get('/result/:messageTxId', middleware({ processIdFromRequest: (req) => req.query['process-id'] }))
  app.get('/results/:processId', middleware({ processIdFromRequest: (req) => req.params.processId }))
  app.get('/state/:processId', middleware({ processIdFromRequest: (req) => req.params.processId }))
  app.get('/cron/:processId', middleware({ processIdFromRequest: (req) => req.params.processId }))
  app.post('/dry-run', middleware({ processIdFromRequest: (req) => req.query['process-id'] }))
}
