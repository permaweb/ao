import express from 'express'
import bodyParser from 'body-parser'

import baseRoute from './routes/base.js'
import writeRoute from './routes/write.js'
import errors from './errors/errors.js'

const app = express()
const PORT = 3004

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.use('/', baseRoute)
app.use('/write', writeRoute)

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})

app.use(errors)
