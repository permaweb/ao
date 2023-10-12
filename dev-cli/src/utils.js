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

export function tagsArg (tags) {
  return tags ? ['-e', `TAGS=${tags.join(',')}`] : []
}

export function hostArgs (host) {
  return host
    ? [
        '-e',
        `BUNDLER_HOST=${host}`
      ]
    : []
}
