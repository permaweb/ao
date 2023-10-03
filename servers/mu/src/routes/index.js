import baseRoute from './base/index.js'
import writeRoute from './write/index.js'
import traceRoute from './trace/index.js'

const mountRoutes = (app) => [
  ['/', baseRoute],
  ['/write', writeRoute],
  ['/trace', traceRoute]
].reduce(
  (app, [route, middleware]) => app.use(route, middleware),
  app
)

export default mountRoutes
