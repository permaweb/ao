import express from 'express'
import mountMiddlewares from './middleware/index.js'
import mountRoutes from './routes/index.js'
import config from './config.js'

const app = [mountMiddlewares, mountRoutes].reduce(
  (app, mounter) => mounter(app),
  express()
)

app.listen(config.port, () => {
  console.log(`Server is running on http://localhost:${config.port}`)
})
