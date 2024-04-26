import path from 'node:path'
import fs from 'node:fs'

import dotenv from 'dotenv'

import { z } from 'zod'
dotenv.config()

export const configSchema = z.object({
  CU_URL: z.string().url('CU_URL must be a a valid URL'),
  MU_WALLET: z.record(z.any()),
  GRAPHQL_URL: z.string(),
  UPLOADER_URL: z.string(),
  CRON_CURSOR_DIR: z.string()
})

const walletPath = process.env.PATH_TO_WALLET
const walletKey = JSON.parse(fs.readFileSync(path.resolve(walletPath), 'utf8'))

const MODE = process.env.NODE_CONFIG_ENV

if (!MODE) throw new Error('NODE_CONFIG_ENV must be defined')

const CONFIG_ENVS = {
  development: {
    MODE,
    MU_WALLET: walletKey,
    CU_URL: process.env.CU_URL || 'https://cu.ao-testnet.xyz',
    GRAPHQL_URL: process.env.GRAPHQL_URL || 'https://arweave.net/graphql',
    UPLOADER_URL: process.env.UPLOADER_URL || 'https://up.arweave.net',
    CRON_CURSOR_DIR: process.env.CRON_CURSOR_DIR || 'cursor.txt'
  },
  production: {
    MODE,
    MU_WALLET: walletKey,
    CU_URL: process.env.CU_URL,
    GRAPHQL_URL: process.env.GRAPHQL_URL || 'https://arweave.net/graphql',
    UPLOADER_URL: process.env.UPLOADER_URL || 'https://up.arweave.net',
    CRON_CURSOR_DIR: process.env.CRON_CURSOR_DIR || 'cursor.txt'
  }
}

export const config = configSchema.parse(CONFIG_ENVS[MODE])
