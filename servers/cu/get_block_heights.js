import https from 'https'

async function fetchBlockHeight (processId, nonce) {
  const gqlQuery = JSON.stringify({
    query: `
      query {
        transactions(
          tags: [
            { name: "Process", values: ["${processId}"] }
            { name: "Type", values: ["Assignment"] }
            { name: "Data-Protocol", values: ["ao"] },
            { name: "Nonce", values: ["${nonce}"] }
          ],
          owners: ["fcoN_xJeisVsPXA-trzVAuIiqO3ydLQxM-L4XbrQKzY"],
          first: 1,
          sort: HEIGHT_DESC
        ) {
          edges {
            node {
              tags {
                name
                value
              }
            }
          }
        }
      }
    `
  })

  const options = {
    hostname: 'arweave-search.goldsky.com',
    path: '/graphql',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(gqlQuery)
    }
  }

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        try {
          const response = JSON.parse(data)
          const edges = response?.data?.transactions?.edges || []
          const blockHeightTag = edges[0]?.node?.tags.find(tag => tag.name === 'Block-Height')
          const blockHeight = blockHeightTag ? parseInt(blockHeightTag.value, 10) : null
          resolve(blockHeight)
        } catch (error) {
          reject(error)
        }
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    req.write(gqlQuery)
    req.end()
  })
}

(async () => {
  const args = process.argv.slice(2)
  const [processId1, nonce1, processId2, nonce2] = args

  try {
    const blockHeight1 = await fetchBlockHeight(processId1, nonce1)
    const blockHeight2 = await fetchBlockHeight(processId2, nonce2)

    console.log(
      JSON.stringify({
        block_height_1: blockHeight1,
        block_height_2: blockHeight2
      })
    )
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
})()
