import baseRoute from './base.js'
import writeRoute from './write.js'

const mountRoutes = (app) => [
  ['/', baseRoute],
  ['/write', writeRoute]
].reduce(
  (app, [route, middleware]) => app.use(route, middleware),
  app
)

export default mountRoutes
