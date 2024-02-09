#! /usr/bin/env node

import fs from 'node:fs'

import { ArtifactNotFoundError, BundlerHostNotSupportedError, SUPPORTED_BUNDLERS, WalletNotFoundError, parseTags, uploadModuleWith } from '../main.js'
import { AoModuleTags } from '../defaults.js'
import { UPLOADERS } from '../clients.js'

const uploadModule = uploadModuleWith({
  walletExists: async (path) => fs.existsSync(path),
  /**
   * implement to check if single file exists
   */
  artifactExists: async (path) => fs.existsSync(path),
  /**
   * implement to read the wallet as JSON from the path
   */
  readWallet: async (path) => JSON.parse(fs.readFileSync(path).toString()),
  /**
   * A map of upload implementations. The BL will choose the uploader
   * based on the provided host.
   *
   * This allows for dynamically choosing the impl to perform the upload,
   * ie. supporting multiple Bundlers
   */
  uploaders: UPLOADERS
})

/**
 * The ao cli publish command ultimately executes this
 * code.
 *
 * It expects a wallet JWK to be present in the provided directory
 * in order to perform the upload to Arweave via the specified uploader
 */
Promise.resolve()
  .then(() =>
    uploadModule({
      walletPath: process.env.WALLET_PATH,
      artifactPath: process.env.MODULE_WASM_PATH,
      to: process.env.BUNDLER_HOST,
      tags: [
        ...parseTags(process.env.TAGS || JSON.stringify([[], []])),
        // Add the proper tags for ao contract source
        ...AoModuleTags
      ]
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
      case ArtifactNotFoundError.code: {
        console.error('Module source not found at the specified path. Make sure to provide the path to your built Wasm')
        return process.exit(1)
      }
      case BundlerHostNotSupportedError.code: {
        console.error(
          'The bundler host is not supported. Host must be from supported bundlers: ',
          Object.keys(SUPPORTED_BUNDLERS).join(', ')
        )
        return process.exit(1)
      }
      default: {
        throw err
      }
    }
  })
