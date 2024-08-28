import pkg from 'warp-arbundles'
const { createData, ArweaveSigner } = pkg

function buildAndSignWith ({ MU_WALLET }) {
  /**
   * @name buildAndSign
   * Given some metadata, create a signed data item.
   *
   * @param processId
   * @param data
   * @param tags
   * @param anchor
   *
   * @returns id - the data item's id
   * @returns data - the data item's raw data as a buffer array
   * @returns processId
   */
  return async ({ processId, data, tags, anchor }) => {
    data = data || ' ' // If no data, send a single space
    const signer = new ArweaveSigner(MU_WALLET)

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
