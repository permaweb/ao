import path from 'node:path'
import fs from 'node:fs'

import dotenv from 'dotenv'
dotenv.config()


import { z } from 'zod'

export const configSchema = z.object({
  CU_URL: z.string().url('CU_URL must be a a valid URL'),
  MU_WALLET: z.record(z.any()),
  GATEWAY_URL: z.string(),
  UPLOADER_URL: z.string()
})

const walletPath = process.env.PATH_TO_WALLET
const walletKey = JSON.parse(fs.readFileSync(path.resolve(walletPath), 'utf8'))

const MODE = process.env.NODE_CONFIG_ENV

if (!MODE) throw new Error('NODE_CONFIG_ENV must be defined')

const CONFIG_ENVS = {
  development: {
    MODE,
    MU_WALLET: walletKey,
    CU_URL: process.env.CU_URL || 'https://ao-cu-1.onrender.com',
    GATEWAY_URL: process.env.GATEWAY_URL || 'https://arweave.net',
    UPLOADER_URL: process.env.UPLOADER_URL || 'https://up.arweave.net'
  },
  production: {
    MODE,
    MU_WALLET: walletKey,
    CU_URL: process.env.CU_URL,
    GATEWAY_URL: process.env.GATEWAY_URL,
    UPLOADER_URL: process.env.UPLOADER_URL || 'https://up.arweave.net'
  }
}

export const config = configSchema.parse(CONFIG_ENVS[MODE])
