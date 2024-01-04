import { readFileSync } from 'node:fs'

import { connect, createDataItemSigner } from '@permaweb/ao-sdk'

const wallet = JSON.parse(readFileSync(process.env.PATH_TO_WALLET).toString())

const { message } = connect({ MU_URL: 'http://localhost:3004' })

await message({
  process: '6UaEJBBhXWFxa8q1XZWanQJ8g_OGfhXMgrjWqP0b94g',
  tags: [
    { name: 'function', value: 'ping' },
    { name: 'friend', value: 'BajGSLpJofWLjtlXN-bgzcuulWGZryfsmHXXrdVJl4A' }
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
