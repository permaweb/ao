#! /usr/bin/env node

import fs from 'node:fs'

import { BundlerHostNotSupportedError, InvalidFundAmountError, WalletNotFoundError, fundWith } from '../main.js'
import { FUNDERS } from '../clients.js'

const fund = fundWith({
  walletExists: async (path) => fs.existsSync(path),
  /**
   * implement to read the wallet as JSON from the path
   */
  readWallet: async (path) => JSON.parse(fs.readFileSync(path).toString()),
  /**
   * A map of funder implementations. The BL will choose the funder
   * based on the provided host.
   *
   * This allows for dynamically choosing the impl to fund the bundler,
   * ie. supporting multiple Bundlers
   */
  funders: FUNDERS
})

/**
 * The ao cli bundler fund command ultimately executes this
 * code.
 *
 * It expects a wallet JWK to be present in the provided directory
 * in order to fund the specified Bundler
 */
Promise.resolve()
  .then(() =>
    fund({
      walletPath: process.env.WALLET_PATH,
      to: process.env.BUNDLER_HOST,
      amount: parseInt(process.env.BUNDLER_FUND_AMOUNT || '0')
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
      case InvalidFundAmountError.code: {
        console.error('The amount you are funding must be greater than 0')
        return process.exit(1)
      }
      default: {
        throw err
      }
    }
  })
