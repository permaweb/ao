import baseRoute from './base.js'
import contractRoute from './contract.js'
import resultRoute from './result.js'

const mountRoutes = (app) => [
  ['/', baseRoute],
  ['/contract', contractRoute],
  ['/result', resultRoute]
].reduce(
  (app, [route, middleware]) => app.use(route, middleware),
  app
)

export default mountRoutes
