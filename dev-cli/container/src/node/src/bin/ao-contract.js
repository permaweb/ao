#! /usr/bin/env node

import fs from 'node:fs'
import { createContract, createDataItemSigner } from '@permaweb/ao-sdk'

import { parseTags, createContractWith } from '../main.js'

const uploadHyperbeamContract = createContractWith({
  walletExists: async (path) => fs.existsSync(path),
  /**
   * implement to read the wallet as JSON from the path
   */
  readWallet: async (path) => JSON.parse(fs.readFileSync(path).toString()),
  /**
   * implement to create a contract using the ao SDK
   */
  create: async ({ src, tags, initialState, wallet }) => {
    return createContract({
      srcId: src,
      initialState,
      tags,
      signer: createDataItemSigner(wallet)
    }).then((contractId) => ({ contractId }))
  }
})

/**
 * The ao cli contract command ultimately executes this
 * code.
 *
 * It expects a wallet JWK to be present in the provided directory
 * in order to creat the contract using the ao SDK
 */
Promise.resolve()
  .then(() =>
    uploadHyperbeamContract({
      walletPath: process.env.WALLET_PATH,
      src: process.env.CONTRACT_SOURCE_TX,
      tags: parseTags(process.env.TAGS || ''),
      initialState: process.env.INITIAL_STATE
    })
  )
  // log transaction id
  .then(console.log)
  .catch((err) => {
    switch (err.code) {
      case 'WalletNotFound': {
        console.error(
          'Wallet not found at the specified path. Make sure to provide the path to your wallet with -w'
        )
        return process.exit(1)
      }
      default: {
        throw err
      }
    }
  })
