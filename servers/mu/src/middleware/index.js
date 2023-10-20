import bodyParser from 'body-parser'
import cors from 'cors'

import errors from './errors/errors.js'

import { initMsgs, crankMsgs } from '../domain/index.js'

function injectDomain (req, _res, next) {
  req.domain = {}
  req.domain.initMsgs = initMsgs
  req.domain.crankMsgs = crankMsgs
  next()
}

const mountMiddlewares = (app) => [
  cors(),
  bodyParser.json(),
  bodyParser.urlencoded({ extended: false }),
  injectDomain,
  errors
].reduce(
  (app, middleware) => app.use(middleware),
  app
)

export default mountMiddlewares
