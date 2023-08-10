// NOTE: It is currently required to use a script file in order to run json2ts instead of using its
// CLI because the CLI interprets `--additionalProperties false` as `false` being a string.

import { parse, join } from 'node:path';
import { readdirSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';

import { compileFromFile } from 'json-schema-to-typescript';
import { writeImplementationFile } from './generation-utils';

const BINDINGS_ROOT = './crates/pst/contract/definition/bindings';
const BINDINGS_JSON = join(BINDINGS_ROOT, 'json');
const BINDINGS_TS = join(BINDINGS_ROOT, 'ts');

mkdirSync(BINDINGS_TS, { recursive: true });

const getFile = (name: string) => {
  const filePath = join(BINDINGS_JSON, name);
  return JSON.parse(readFileSync(filePath, 'utf-8'));
};

for (const fileName of readdirSync(BINDINGS_JSON)) {
  const jsonPath = join(BINDINGS_JSON, fileName);
  const tsPath = join(BINDINGS_TS, parse(fileName).name + '.ts');
  const file = getFile(fileName);
  delete file['$schema'];
  file.oneOf.forEach((f) => {
    f['$schema'] = 'http://json-schema.org/draft-07/schema#';
    f.title = f.properties.function.enum[0];
    delete f.properties.function;
  });
  writeFileSync(join(BINDINGS_JSON, fileName), JSON.stringify(file));

  compileFromFile(jsonPath, {
    additionalProperties: false
  }).then((tsContent) => writeFileSync(tsPath, tsContent));
}

writeImplementationFile(BINDINGS_TS, [
  getFile('View.json'),
  getFile('WriteAction.json'),
  getFile('ContractState.json')
  // eslint-disable-next-line
]).catch((e) => console.log(e));
