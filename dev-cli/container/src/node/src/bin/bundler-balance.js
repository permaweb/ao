#! /usr/bin/env node

import fs from 'node:fs'

import { BundlerHostNotSupportedError, WalletNotFoundError, checkBalanceWith } from '../main.js'
import { BALANCERS } from '../clients.js'

const checkBundlerBalance = checkBalanceWith({
  walletExists: async (path) => fs.existsSync(path),
  /**
   * implement to read the wallet as JSON from the path
   */
  readWallet: async (path) => JSON.parse(fs.readFileSync(path).toString()),
  /**
   * A map of balance implementations. The BL will choose the balancer
   * based on the provided host.
   *
   * This allows for dynamically choosing the impl to check the balance,
   * ie. supporting multiple Bundlers
   */
  balancers: BALANCERS
})

/**
 * The ao cli bundler balance command ultimately executes this
 * code.
 *
 * It expects a wallet JWK to be present in the provided directory
 * in order to check the balance on the specified Bundler
 */
Promise.resolve()
  .then(() =>
    checkBundlerBalance({
      walletPath: process.env.WALLET_PATH,
      to: process.env.BUNDLER_HOST
    })
  )
  // log transaction id
  .then(console.log)
  .catch((err) => {
    switch (err.code) {
      case WalletNotFoundError.code: {
        console.error('Wallet not found at the specified path. Make sure to provide the path to your wallet with -w')
        return process.exit(1)
      }
      case BundlerHostNotSupportedError.code: {
        console.error('The bundler host is not supported. The only currently supported bundler is Irys')
        return process.exit(1)
      }
      default: {
        throw err
      }
    }
  })
