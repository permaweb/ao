const { build } = require('esbuild');
const rimraf = require('rimraf');
const plugin = require('node-stdlib-browser/helpers/esbuild/plugin');
const stdLibBrowser = require('node-stdlib-browser');

const clean = async () => {
  return new Promise((resolve) => {
    rimraf('./bundles', () => resolve());
  });
};

const runBuild = async () => {
  await clean();

  const buildConfig = {
    entryPoints: ['./src/index.ts'],
    bundle: true,
    platform: 'browser',
    target: ['esnext'],
    format: 'esm',
    globalName: 'warp',
    inject: [require.resolve('node-stdlib-browser/helpers/esbuild/shim')],
    plugins: [plugin(stdLibBrowser)]
  };

  console.log('Building web bundle esm.');
  await build({
    ...buildConfig,
    minify: true,
    outfile: './bundles/web.bundle.min.js'
  }).catch((e) => {
    console.log(e);
    process.exit(1);
  });
};
runBuild().finally(() => {
  console.log('Build done.');
});

module.exports = runBuild;
