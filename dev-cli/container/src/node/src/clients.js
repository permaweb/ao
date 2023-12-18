import Irys from '@irys/sdk'

import { SUPPORTED_BUNDLERS } from './main.js'

/**
 * Client map that contains per client implementations
 * for each injected side effect
 *
 * TODO implement more clients for various apis
 */
export const UPLOADERS = {
  [SUPPORTED_BUNDLERS.IRYS]: ({ path, wallet, to: irysNode, ...rest }) => {
    const irys = new Irys({ url: irysNode, token: 'arweave', key: wallet })
    return irys.uploadFile(path, rest)
  },
  [SUPPORTED_BUNDLERS.UP]: ({ path, wallet, to: irysNode, ...rest }) => {
    /**
     * TODO: do not use the Irys SDK
     */
    const irys = new Irys({ url: irysNode, token: 'arweave', key: wallet })
    return irys.uploadFile(path, rest)
  }
}

export const BALANCERS = {
  [SUPPORTED_BUNDLERS.IRYS]: ({ wallet, to: irysNode }) => {
    const irys = new Irys({ url: irysNode, token: 'arweave', key: wallet })
    return irys.getLoadedBalance().then(balance => ({ balance }))
  },
  [SUPPORTED_BUNDLERS.UP]: () => {
    return { balance: 'This Bundler is 100% subsidized. No balance is required' }
  }
}

export const FUNDERS = {
  [SUPPORTED_BUNDLERS.IRYS]: ({ wallet, to: irysNode, amount }) => {
    const irys = new Irys({ url: irysNode, token: 'arweave', key: wallet })
    return irys.fund(amount).then(res => ({ id: res.id }))
  },
  [SUPPORTED_BUNDLERS.UP]: () => {
    return { id: 'This Bundler is 100% subsidized. No funding is required' }
  }
}
