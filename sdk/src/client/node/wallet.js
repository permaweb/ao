import fs from 'node:fs'
import WarpArBundles from 'warp-arbundles'

const { createData, ArweaveSigner } = WarpArBundles

/**
 * Build a wallet instance based on the node environment
 *
 * we inject these as part of the entrypoint, which allows us
 * to unit test this logic using stubs
 */

/**
 * TODO: figure out api to inject, so we can unit test this
 */
export function createAndSignWith () {
  return async ({ data, tags, wallet }) => {
    const signer = new ArweaveSigner(wallet)
    const dataItem = createData(data, signer, { tags })
    return dataItem.sign(signer)
      .then(async () => ({
        id: await dataItem.id,
        raw: await dataItem.getRaw()
      }))
  }
}

/**
 * implement to check the wallet on the file system
 */
export function walletExistsWith () {
  return async (wallet) => fs.existsSync(wallet)
}

/**
 * implement to read the wallet as JSON from the path
 */
export function readWalletWith () {
  return async (wallet) => JSON.parse(fs.readFileSync(wallet).toString())
}
