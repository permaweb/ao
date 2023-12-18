import { basename, resolve } from './deps.js'

export function walletArgs (wallet) {
  /**
   * Use wallet in pwd by default
   */
  wallet = wallet || 'wallet.json'
  const walletName = basename(wallet)
  const walletDest = `/src/${walletName}`

  const walletSrc = resolve(wallet)

  return wallet
    ? [
        // mount the wallet to file in /src
        '-v',
        `${walletSrc}:${walletDest}`,
        '-e',
        `WALLET_PATH=${walletDest}`
      ]
    : []
}

export function tagsArg ({ tags, values }) {
  if (!tags && !values) return []
  if (tags && !values) throw new Error('tag values required')
  if (values && !tags) throw new Error('tag names required')
  if (tags.length !== values.length) throw new Error('tag value length mismatch')

  /**
   * Pass a stringified zip of [ [tag1, tag2], [value1, value2] ]
   */
  return ['-e', `TAGS=${JSON.stringify([tags, values])}`]
}

export function hostArgs (host) {
  return host
    ? [
        '-e',
        `BUNDLER_HOST=${host}`
      ]
    : []
}
