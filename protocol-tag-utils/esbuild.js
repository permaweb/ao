import { readFileSync } from 'node:fs'
import * as esbuild from 'esbuild'

/**
 * By importing from manifest, build will always be in sync with the manifest
 */
const manifest = JSON.parse(readFileSync('./package.json'))

// CJS
await esbuild.build({
  entryPoints: ['index.js'],
  platform: 'node',
  format: 'cjs',
  bundle: true,
  outfile: manifest.main
})

// ESM
await esbuild.build({
  entryPoints: ['index.js'],
  platform: 'node',
  format: 'esm',
  bundle: true,
  outfile: manifest.module
})
