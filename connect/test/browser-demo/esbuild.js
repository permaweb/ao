import fs from 'node:fs'
import esbuild from 'esbuild'
import sveltePlugin from 'esbuild-svelte'

if (!fs.existsSync('./dist')) fs.mkdirSync('./dist')

esbuild.build({
  entryPoints: ['./src/app.js'],
  mainFields: ['svelte', 'browser', 'module', 'main'],
  conditions: ['svelte', 'browser'],
  outdir: './dist',
  format: 'esm',
  logLevel: 'info',
  minify: false,
  bundle: true,
  splitting: true,
  sourcemap: 'inline',
  plugins: [sveltePlugin()]
})
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })

fs.copyFileSync('./index.html', './dist/index.html')
