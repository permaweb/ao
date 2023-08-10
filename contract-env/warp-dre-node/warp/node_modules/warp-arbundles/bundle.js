const { build } = require('esbuild');
const { rimraf } = require('rimraf');
const fs = require('fs');
const path = require('path');

const clean = async () => {
  rimraf('./build/web/esm/bundle.js');
};

const runBuild = async () => {
  await clean();

  const buildConfig = {
    entryPoints: ['./build/web/esm/webIndex.js'],
    bundle: true,
    platform: 'browser',
    target: ['esnext'],
    format: 'esm',
    globalName: 'warp',
  };

  console.log('Building web bundle esm.');
  const result = await build({
    ...buildConfig,
    minify: true,
    metafile: true,
    outfile: './build/web/esm/bundle.js',
  }).catch((e) => {
    console.log(e);
    process.exit(1);
  });
  fs.writeFileSync(path.join(__dirname, 'metafile.json'), JSON.stringify(result.metafile));
};
runBuild().finally(() => {
  console.log('Build done.');
});

module.exports = runBuild;
