import { connect } from '@permaweb/ao-sdk'

const MESSAGE_ID = process.env.MESSAGE_ID

if (!MESSAGE_ID) throw new Error('MESSAGE_ID env var is required, so as to know which process is receiving the message')

const { result } = connect()

await result({ message: MESSAGE_ID })
  .then(console.log)
  .catch(console.error)
