import * as esbuild from 'esbuild'

await esbuild.build({
  entryPoints: ['src/index2.js'],
  platform: 'node',
  format: 'esm',
  bundle: true,
  outfile: 'dist/index.js'
})
