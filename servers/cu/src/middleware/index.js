import bodyParser from 'body-parser'
import errors from './errors/index.js'
import { readState } from './ao/index.js'

function injectDomain (req, _res, next) {
  req.domain = {}
  req.domain.readState = readState
  next()
}

const mountMiddlewares = (app) => [
  bodyParser.json(),
  bodyParser.urlencoded({ extended: false }),
  injectDomain,
  errors
].reduce(
  (app, middleware) => app.use(middleware),
  app
)

export default mountMiddlewares
