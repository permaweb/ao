import Arweave from 'arweave'

let arweave
export function createWalletClient () {
  if (arweave) return arweave
  arweave = Arweave.init()
  return arweave
}

export function addressWith ({ WALLET, arweave }) {
  const wallet = JSON.parse(WALLET)
  const addressP = arweave.wallets.jwkToAddress(wallet)

  return () => addressP
}
