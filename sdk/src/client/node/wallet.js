import WarpArBundles from 'warp-arbundles'

const { createData, ArweaveSigner } = WarpArBundles

/**
 * A function that builds a signer using a wallet jwk interface
 * commonly used in node-based dApps
 *
 * This is provided as a convenience for consumers of the SDK
 * to use, but consumers can also implement their own signer
 */
export function createDataItemSigner (wallet) {
  const signer = async ({ data, tags }) => {
    const signer = new ArweaveSigner(wallet)
    const dataItem = createData(data, signer, { tags })
    return dataItem.sign(signer)
      .then(async () => ({
        id: await dataItem.id,
        raw: await dataItem.getRaw()
      }))
  }

  return signer
}
