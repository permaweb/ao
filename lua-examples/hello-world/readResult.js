import { connect } from '../../sdk/src/index.js'

const MESSAGE_ID = process.env.MESSAGE_ID

if (!MESSAGE_ID) throw new Error('MESSAGE_ID env var is required, so as to know which process is receiving the message')

const { readResult } = connect()

await readResult({ messageId: MESSAGE_ID })
  .then(console.log)
  .catch(console.error)
