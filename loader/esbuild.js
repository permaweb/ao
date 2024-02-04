import * as esbuild from 'esbuild'

await esbuild.build({
  entryPoints: ['src/main.js'],
  platform: 'node',
  format: 'cjs',
  bundle: true,
  outfile: 'dist/index.cjs'
})
