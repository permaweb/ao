/* eslint-disable */
import {defaultCacheOptions, LoggerFactory, WarpFactory} from '../src';
import os from 'os';
import {JWKInterface} from "arweave/web/lib/wallet";
import fs from "fs";
import { ArweaveGQLTxsFetcher } from "../src/core/modules/impl/ArweaveGQLTxsFetcher";

const logger = LoggerFactory.INST.create('Contract');

//LoggerFactory.use(new TsLogFactory());
//LoggerFactory.INST.logLevel('error');

LoggerFactory.INST.logLevel('debug', 'DefaultStateEvaluator');
LoggerFactory.INST.logLevel('debug', 'CacheableStateEvaluator');
LoggerFactory.INST.logLevel('debug', 'ArweaveGQLTxsFetcher');

async function main() {
  printTestInfo();

  const heapUsedBefore = Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100;
  const rssUsedBefore = Math.round((process.memoryUsage().rss / 1024 / 1024) * 100) / 100;

  const warp = WarpFactory
    .forMainnet({...defaultCacheOptions, inMemory: true}, true)

  try {
    const contract = warp
      .contract("bLAgYxAdX2Ry-nt6aH2ixgvJXbpsEYm28NgJgyqfs-U")
    const result = await contract.readState();
    console.dir(result.cachedValue.validity, {depth: null});
  } catch (e) {
    console.error(e);
  }

  const heapUsedAfter = Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100;
  const rssUsedAfter = Math.round((process.memoryUsage().rss / 1024 / 1024) * 100) / 100;
  logger.warn('Heap used in MB', {
    usedBefore: heapUsedBefore,
    usedAfter: heapUsedAfter
  });

  logger.info('RSS used in MB', {
    usedBefore: rssUsedBefore,
    usedAfter: rssUsedAfter
  });

  return;
}

function printTestInfo() {
  console.log('Test info  ');
  console.log('===============');
  console.log('  ', 'OS       ', os.type() + ' ' + os.release() + ' ' + os.arch());
  console.log('  ', 'Node.JS  ', process.versions.node);
  console.log('  ', 'V8       ', process.versions.v8);
  let cpus = os
    .cpus()
    .map(function (cpu) {
      return cpu.model;
    })
    .reduce(function (o, model) {
      if (!o[model]) o[model] = 0;
      o[model]++;
      return o;
    }, {});

  cpus = Object.keys(cpus)
    .map(function (key) {
      return key + ' \u00d7 ' + cpus[key];
    })
    .join('\n');
  console.log('  ', 'CPU      ', cpus);
  console.log('  ', 'Memory   ', (os.totalmem() / 1024 / 1024 / 1024).toFixed(0), 'GB');
  console.log('===============');


}

main().catch((e) => console.error(e));

function readJSON(path: string): JWKInterface {
  const content = fs.readFileSync(path, "utf-8");
  try {
    return JSON.parse(content);
  } catch (e) {
    throw new Error(`File "${path}" does not contain a valid JSON`);
  }
}
