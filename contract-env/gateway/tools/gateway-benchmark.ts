/* eslint-disable */

import Arweave from 'arweave';
import {
  ArweaveGatewayInteractionsLoader,
  DefaultEvaluationOptions,
  LoggerFactory,
  RedstoneGatewayInteractionsLoader,
  Benchmark,
  EvaluationOptions,
} from 'redstone-smartweave';
import { TsLogFactory } from 'redstone-smartweave/lib/cjs/logging/node/TsLogFactory';
import Table from 'cli-table';
import colors from 'colors/safe';

/*
Script allows to benchmark loading interactions response time based on the given gateway
To run this script properly, one need to pass [gateway name][contract id][from][to] variables as script's arguments
e.g yarn ts-node tools/gateway-benchmark.ts arweave Daj-MNSnH55TDfxqC7v4eq0lKzVIwh98srUaWqyuZtY 0 70000.
[from] and [to] parameters are optional, if null - 0 and 840735 will be put accordingly
*/

async function gatewayBenchmark() {
  const table = new Table({
    head: ['gateway', 'contractId', 'fromBlockHeight', 'toBlockHeight', 'timeSpent'],
    colWidths: [10, 50, 20, 20, 20],
  });

  const arweave = Arweave.init({
    host: 'arweave.net',
    port: 443,
    protocol: 'https',
    logging: false,
  });

  LoggerFactory.use(new TsLogFactory());
  LoggerFactory.INST.logLevel('debug');

  const gateway = process.argv[2];
  const contractId = process.argv[3];
  const fromBlockHeight = process.argv[4];
  const toBlockHeight = process.argv[5];

  const loader =
    gateway == 'arweave'
      ? new ArweaveGatewayInteractionsLoader(arweave)
      : new RedstoneGatewayInteractionsLoader('https://gateway.redstone.finance');

  const options = gateway == 'arweave' ? new DefaultEvaluationOptions() : null;

  const benchmark = Benchmark.measure();

  await loader.load(
    contractId,
    fromBlockHeight ? parseInt(fromBlockHeight) : 0,
    toBlockHeight ? parseInt(toBlockHeight) : 840735,
    options as EvaluationOptions
  );

  const timeSpent = benchmark.elapsed();

  table.push([gateway, contractId, fromBlockHeight, toBlockHeight, timeSpent.toString()].map((el) => colors.blue(el)));

  console.log(table.toString());
}

gatewayBenchmark().catch((e) => console.error(e));
