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
  }
}
