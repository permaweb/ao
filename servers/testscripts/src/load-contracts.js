const fs = require('fs')
const path = require('path')
const Bundlr = require('@bundlr-network/client');

// xt8cgXEUt0Pihyc-5YkrT2udUJpF7BpDaiW42r5s_Go - response contract
// 3t11is2R8xej38REbRjNV2mFatAbe-vMJ3OpisM1Ew8 - contract

(async function () {
  console.log('Loading test contract...')

  const walletPath = process.env.PATH_TO_WALLET

  const walletKey = JSON.parse(fs.readFileSync(path.resolve(walletPath), 'utf8'))

  const bundlr = new Bundlr('https://node2.bundlr.network', 'arweave', walletKey)

  let CONTRACT_SRC = 'Plz3Mr5WAvxrc84smo8txFny3jtTiKPNVde_H3hVFko'

  let contractTags = [
    { name: 'Content-Type', value: 'text/plain' },
    { name: 'App-Name', value: 'SmartWeaveContract' },
    { name: 'App-Version', value: '0.3.0' },
    { name: 'Contract-Src', value: CONTRACT_SRC },
    {
      name: 'Init-State',
      value: JSON.stringify({
        balances: [
          { foo: 1 }
        ]
      })
    },
    { name: 'Title', value: 'ao test' },
    { name: 'Description', value: 'Description' },
    { name: 'Type', value: 'Text' }
  ]

  let tx = await bundlr.upload('ao test', { tags: contractTags })

  console.log(tx)

  CONTRACT_SRC = '1mZusVsZJex7vTSdarZJgG-NH4TCAqEw4hkiBDoH3YE'

  contractTags = [
    { name: 'Content-Type', value: 'text/plain' },
    { name: 'App-Name', value: 'SmartWeaveContract' },
    { name: 'App-Version', value: '0.3.0' },
    { name: 'Contract-Src', value: CONTRACT_SRC },
    {
      name: 'Init-State',
      value: JSON.stringify({
        balances: [
          { foo: 1 }
        ],
        sendToContract: tx.id
      })
    },
    { name: 'Title', value: 'ao test' },
    { name: 'Description', value: 'Description' },
    { name: 'Type', value: 'Text' }
  ]

  tx = await bundlr.upload('ao test', { tags: contractTags })

  console.log(tx)
})()
