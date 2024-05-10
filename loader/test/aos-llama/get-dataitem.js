const GRAPHQL = 'https://g8way.io/graphql'
const GATEWAY = 'https://g8way.io'

async function blobToUint8Array (blob) {
  const arrayBuffer = await blob.arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)
  return uint8Array
}

export async function getDataItem (tx) {
  /**
   * This function needs to use graphql to get the dataitem metadata and a gateway to get
   * the data, then combine them together in a single JSON data object
   */
  return fetch(GRAPHQL, {
    method: 'POST',
    body: JSON.stringify({ query: query(tx) }),
    headers: { 'Content-Type': 'application/json' }
  })
    .then(res => res.json())
    .then(({ data: { transaction } }) => ({
      Id: transaction.id,
      Anchor: transaction.anchor,
      Target: transaction.recipient,
      Owner: transaction.owner.address,
      Tags: transaction.tags,
      'Block-Height': transaction.block.height,
      Timestamp: transaction.block.timestamp
    }))
    .then(dataItem => fetch(GATEWAY + '/' + dataItem.Id)
      .then(res => res.blob())
      .then(blob => blobToUint8Array(blob))
      .then(Data => ({ ...dataItem, Data }))
    )
  // .then(dataItem => ({ ...dataItem, Data: btoa(dataItem.Data) }))
}

function query (tx) {
  return `query {
  transaction(id: "${tx}") {
    id 
    anchor
    recipient
    owner {
      address 
    }
    tags {
      name 
      value 
    }
    block {
      height
      timestamp
    }
  }
}
  `
}
