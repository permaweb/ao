#!/usr/bin/env node
'use strict';
const isValidIdentifier = require('is-valid-identifier');
const { resolve, relative, dirname } = require('path');
const fs = require('fs');

const source = process.argv[2];
let target = process.argv[3] || '-';
let exclude = process.argv[4] || '';

if (target.startsWith('--')) {
  exclude = target;
  target = '-';
}

if (typeof source !== 'string' || exclude && !exclude.startsWith('--exclude=')) {
  console.error('Usage: gen-esm-wrapper <path-to-module> <path-to-output> [options]');
  console.error();
  console.error('Options:');
  console.error();
  console.error('    --exclude=regexp\tomit matching keys from the output');
  process.exitCode = 1;
  return;
}
else if (exclude) {
  try {
    // '--exclude='.length === 10
    exclude = new RegExp(exclude.substring(10));
  }
  catch (ex) {
    console.error('Invalid regular expression provided for --exclude');
    process.exitCode = 1;
    return;
  }
}

const cjsSource = require.resolve(resolve(source));
const mod = require(cjsSource);
const keys = new Set(Object.getOwnPropertyNames(mod));

// https://github.com/addaleax/gen-esm-wrapper/issues/6
keys.delete('__esModule');

if (typeof mod === 'function') {
  for (const key of ['length', 'prototype', 'name', 'caller'])
    keys.delete(key);
} else if (typeof mod !== 'object' || mod === null) {
  keys.clear();
}

if (exclude)
  for (const key of keys)
    if (exclude.test(key))
      keys.delete(key);

let relPath =
  relative(resolve(target === '-' ? './' : dirname(target)), cjsSource)
  .replace(/\\/g, '/');
if (!relPath.startsWith('./') && !relPath.startsWith('../') && relPath != '..')
  relPath = `./${relPath}`;

let output = `import mod from ${JSON.stringify(relPath)};

`;

if (mod.__esModule && keys.has('default')) {
  output += 'export default mod["default"];\n';
} else {
  output += 'export default mod;\n';
}
for (const key of [...keys].sort()) {
  if (isValidIdentifier(key)) {
    output += `export const ${key} = mod.${key};\n`;
  }
}

if (target === '-') {
  console.log(output);
} else {
  fs.mkdirSync(dirname(target), { recursive: true });
  fs.writeFileSync(target, output);
}
