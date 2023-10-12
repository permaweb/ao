#! /usr/bin/env node

import fs from 'node:fs'

import { ArtifactNotFoundError, BundlerHostNotSupportedError, WalletNotFoundError, parseTags, uploadWith } from '../main.js'
import { AoContractSourceTags } from '../defaults.js'
import { UPLOADERS } from '../clients.js'

const uploadHyperbeamContractSource = uploadWith({
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
    uploadHyperbeamContractSource({
      walletPath: process.env.WALLET_PATH,
      artifactPath: process.env.CONTRACT_WASM_PATH,
      to: process.env.BUNDLER_HOST,
      tags: [
        ...parseTags(process.env.TAGS || ''),
        // Add the proper tags for ao contract source
        ...AoContractSourceTags
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
        console.error('Contract Wasm source not found at the specified path. Make sure to provide the path to your built Wasm')
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
