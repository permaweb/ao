import pkg from 'warp-arbundles'
const { createData, ArweaveSigner } = pkg

function buildAndSignWith ({ MU_WALLET }) {
  return async ({ processId, data, tags, anchor }) => {
    data = data || Math.random().toString().slice(-4)
    const signer = new ArweaveSigner(MU_WALLET)

    console.log(tags)

    const interactionDataItem = createData(data, signer, { target: processId, anchor, tags })
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
