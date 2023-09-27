import { readFileSync } from 'node:fs'
import * as esbuild from 'esbuild'

/**
 * By importing from manifest, build will always be in sync with the manifest
 */
const manifest = JSON.parse(readFileSync('./package.json'))

/**
 * Some dependencies are ESM only, and so cannot be required from a CJS project.
 * So for those dependencies, we make sure to include them in distribution bundle,
 * so CJS projects can use the code, without having to import the dependency at runtime.
 *
 * ie. hyper-async
 */
function allDepsExcept (excluded = []) {
  return Object.keys(manifest.dependencies).filter((dep) =>
    !excluded.includes(dep)
  )
}

// CJS
await esbuild.build({
  entryPoints: ['src/index.js'],
  platform: 'node',
  format: 'cjs',
  external: allDepsExcept(['hyper-async']),
  bundle: true,
  outfile: manifest.main
})

// ESM
await esbuild.build({
  entryPoints: ['src/index.js'],
  platform: 'node',
  format: 'esm',
  external: allDepsExcept(['hyper-async']),
  bundle: true,
  outfile: manifest.module
})

// // Browser CJS
await esbuild.build({
  entryPoints: ['src/index.browser.js'],
  platform: 'browser',
  format: 'cjs',
  bundle: true,
  /**
   * minify for the browser
   */
  minify: true,
  outfile: manifest.browser[manifest.main]
})

// // Browser ESM
await esbuild.build({
  entryPoints: ['src/index.browser.js'],
  platform: 'browser',
  format: 'esm',
  bundle: true,
  /**
   * minify for the browser
   */
  minify: true,
  outfile: manifest.browser[manifest.module]
})
