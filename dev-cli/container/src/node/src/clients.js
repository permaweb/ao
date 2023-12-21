import { readFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'

import urlJoin from 'url-join'
import mime from 'mime-types'
import Arweave from 'arweave'
import Irys from '@irys/sdk'
import WarpArBundles from 'warp-arbundles'

import { SUPPORTED_BUNDLERS } from './main.js'

const { createData, ArweaveSigner } = WarpArBundles

/**
 * Client map that contains per client implementations
 * for each injected side effect
 *
 * TODO implement more clients for various apis
 */
export const UPLOADERS = {
  [SUPPORTED_BUNDLERS.IRYS]: ({ path, wallet, to: irysNode, ...rest }) => {
    const irys = new Irys({ url: irysNode, token: 'arweave', key: wallet })
    /**
     * Response implements { id }
     */
    return irys.uploadFile(path, rest)
  },
  /**
   * TODO: impl could be better
   */
  [SUPPORTED_BUNDLERS.UP]: async ({ path, wallet, to, ...rest }) => {
    const signer = new ArweaveSigner(wallet)

    rest.tags = rest.tags || []

    /**
     * Add the Content-Type tag, if it's not already provided,
     * according to the mime-type obtained from the file path
     */
    if (!rest.tags.find((t) => t.name.toLowerCase() === 'content-type')) {
      const mimeType = mime.contentType(mime.lookup(path) || 'application/octet-stream')
      rest.tags.push({ name: 'Content-Type', value: mimeType })
    }

    /**
     * Create and sign the data item, setting the data to the
     * buffer containing the file contents
     */
    const dataItem = createData(readFileSync(path), signer, {
      anchor: randomBytes(32).toString('base64').slice(0, 32),
      ...rest
    })
    await dataItem.sign(signer)

    /**
     * Response implements { id }
     */
    return fetch(urlJoin(to, '/tx/arweave'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        Accept: 'application/json'
      },
      body: dataItem.getRaw()
    }).then((res) => res.json())
  }
}

export const BALANCERS = {
  [SUPPORTED_BUNDLERS.IRYS]: ({ wallet, to: irysNode }) => {
    const irys = new Irys({ url: irysNode, token: 'arweave', key: wallet })
    return irys.getLoadedBalance().then(balance => ({ balance }))
  },
  [SUPPORTED_BUNDLERS.UP]: async ({ wallet, to }) => {
    const arweave = Arweave.init()
    const address = await arweave.wallets.jwkToAddress(wallet)

    return fetch(urlJoin(to, '/account/balance', address))
      .then((res) => res.json())
      .then((balance) => ({ balance: balance.toLocaleString() }))
  }
}

export const FUNDERS = {
  [SUPPORTED_BUNDLERS.IRYS]: ({ wallet, to: irysNode, amount }) => {
    const irys = new Irys({ url: irysNode, token: 'arweave', key: wallet })
    return irys.fund(amount).then(res => ({ id: res.id }))
  },
  [SUPPORTED_BUNDLERS.UP]: () => {
    return { id: 'up.arweave.net is 100% subsidized and requires no funding' }
  }
}
