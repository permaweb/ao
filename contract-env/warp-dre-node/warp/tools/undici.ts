/* eslint-disable */
import Arweave from 'arweave';
import { LoggerFactory, mapReplacer } from '../src';
import { TsLogFactory } from '../src/logging/node/TsLogFactory';
import Undici from "undici";
import request = Undici.request;
import {Benchmark} from "../src/logging/Benchmark";
import axios from "axios";


async function main() {
  LoggerFactory.use(new TsLogFactory());
  LoggerFactory.INST.logLevel('debug');

  const arweave = Arweave.init({
    host: 'arweave.net', // Hostname or IP address for a Arweave host
    port: 443, // Port
    protocol: 'https', // Network protocol http or https
    timeout: 60000, // Network request timeouts in milliseconds
    logging: false // Enable network request logging
  });


  const benchmark = Benchmark.measure();

  for (let i = 0; i < 100; i++) {
    const {
      statusCode,
      headers,
      trailers,
      body
    } = await request('https://arweave.net:443/info');
    await body.json();
  }

  console.log(`undici: ${benchmark.elapsed()}`);


  benchmark.reset();

  for (let i = 0; i < 100; i++) {
    const result = await axios.get('https://arweave.net:443/info');
  }

  console.log(`axios: ${benchmark.elapsed()}`);

  benchmark.reset();


  console.log(`got: ${benchmark.elapsed()}`);


}

main().catch((e) => console.error(e));
