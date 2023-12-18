import pkg from 'warp-arbundles'
const { createData, ArweaveSigner } = pkg

function buildAndSignWith ({ MU_WALLET }) {
  return async ({ processId, data, tags, anchor }) => {
    data = data || Math.random().toString().slice(-4)
    const signer = new ArweaveSigner(MU_WALLET)

    const allTags = [
      ...tags,
      { name: 'Data-Protocol', value: 'ao' },
      { name: 'Type', value: 'Message' }
    ]

    const interactionDataItem = createData(data, signer, { target: processId, anchor, tags: allTags })
    await interactionDataItem.sign(signer)
    return {
      id: await interactionDataItem.id,
      data: interactionDataItem.getRaw(),
      processId
    }
  }
}

export default {
  buildAndSignWith
}
