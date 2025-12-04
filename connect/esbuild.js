import { readFileSync } from 'node:fs'
import * as esbuild from 'esbuild'
import { nodeModulesPolyfillPlugin } from 'esbuild-plugins-node-modules-polyfill'

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
  outfile: manifest.exports['.'].require
})

// ESM
await esbuild.build({
  entryPoints: ['src/index.js'],
  platform: 'node',
  format: 'esm',
  external: allDepsExcept(['hyper-async']),
  bundle: true,
  outfile: manifest.exports['.'].import
})

// Browser ESM
await esbuild.build({
  entryPoints: ['src/index.browser.js'],
  /**
   * node-http-signatures uses the crypto module, and
   * so we have to polyfill some node modules to build.
   *
   * This unforuntately massively bloats the browser bundle,
   * so we should look at maybe PR'ing to remove the crypto
   * module dep, or fork. Truly unfortunate.
   *
   * TODO: maybe we can just simply import createSignatureBase
   * from 'node-http-signatures/cavage/index.js'
   * and that will treeshake enough?
   *
   * "events" and "stream" have to be polyfilled for @dha-team/arbundles --
   * really not great.
   */
  plugins: [
    nodeModulesPolyfillPlugin({
      globals: {
        process: true
      },
      modules: {
        crypto: true,
        constants: true,
        events: true,
        stream: true,
        process: true
      }
    })
  ],
  platform: 'browser',
  format: 'esm',
  bundle: true,
  minify: true,
  outfile: manifest.exports['.'].browser
})
