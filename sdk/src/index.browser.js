import { WalletClient } from './client/browser/index.js'
import { buildSdk } from './index.common.js'

// TODO: export createContract
// eslint-disable-next-line
const { readState, writeInteraction, createContract } = buildSdk({ WalletClient })

export { readState, writeInteraction }
