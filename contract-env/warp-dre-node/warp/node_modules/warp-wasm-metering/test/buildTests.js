const fs = require('fs');
const cp = require('child_process');
const path = require('path');
const wasm2json = require('warp-wasm-json-toolkit/wasm2json');

function processFiles(path, out) {
  const binPath = `${__dirname}/wabt/out/wast2wasm`;
  const files = fs.readdirSync(path);

  for (let file of files) {
    console.log(file);
    if (file.split('.')[1] === 'wast') {
      // compile to wasm
      const str = `${binPath} ${path}/${file} -o /tmp/temp.wasm`;
      cp.execSync(str);
      const wasm = fs.readFileSync('/tmp/temp.wasm');
      // compile to json
      const json = wasm2json(wasm);
      fs.writeFileSync(`${out}/${file}.json`, JSON.stringify(json, null, 2));
    }
  }
}

processFiles(
  path.join(__dirname, './in/wast'),
  path.join(__dirname, './in/json')
);
processFiles(
  path.join(__dirname, './expected-out/wast'),
  path.join(__dirname, './expected-out/json')
);
