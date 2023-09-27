import path from 'path'
import fs from 'fs'

const walletPath = process.env.PATH_TO_WALLET
const walletKey = JSON.parse(fs.readFileSync(path.resolve(walletPath), 'utf8'))

const config = {
  cuWallet: walletKey,
  port: 3005
}

export default config
