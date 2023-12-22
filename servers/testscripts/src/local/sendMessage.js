import { readFileSync } from 'node:fs'

import { connect, createDataItemSigner } from '@permaweb/ao-sdk'

const wallet = JSON.parse(readFileSync(process.env.PATH_TO_WALLET).toString())

const { message } = connect({ MU_URL: 'http://localhost:3004' })

await message({
  process: 'DIF0J77lxdwOektUZW_BWzCALg9G-w2UNNlXmHyPemw',
  tags: [
    { name: 'function', value: 'ping' },
    { name: 'friend', value: 'aKoff7cbRj42McU36pgaqQMtRIiaiNZzzYnLkDiCTMQ' }
  ],
  signer: createDataItemSigner(wallet)
}).then(console.log)
  .catch(console.error)

// await message({
//   process: 'rXhw86nP-NemRdZaEaG6HzUBGt3EdJ_jnkNoVj-CsaI',
//   tags: [
//     { name: 'function', value: 'ping' },
//     { name: 'friend', value: 'oPjLE8-Ux28KHcW78u655rdMTogLQ54r86yI-H595zs' }
//   ],
//   signer: createDataItemSigner(wallet)
// }).then(console.log)
//   .catch(console.error)
