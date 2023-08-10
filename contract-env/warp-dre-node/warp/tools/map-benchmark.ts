/* eslint-disable */
import Arweave from 'arweave';
import { LoggerFactory } from '../src';
import { TsLogFactory } from '../src/logging/node/TsLogFactory';

async function main() {
  LoggerFactory.use(new TsLogFactory());

  LoggerFactory.INST.logLevel('debug');

  console.time('benchmark_map');
  const map = new Map();
  for (let i = 0; i < 10_000_000; i++) {
    map.set(i, 'duh');
  }
  console.timeEnd('benchmark_map');

  console.time('benchmark_object');
  const o = {};
  for (let i = 0; i < 10_000_000; i++) {
    o[i] = 'duh';
  }
  console.timeEnd('benchmark_object');
  console.log(Object.keys(o).length);
}

main().catch((e) => console.error(e));
