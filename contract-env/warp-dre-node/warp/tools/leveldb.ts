/* eslint-disable */
import {Level} from "level";

import {DEFAULT_LEVEL_DB_LOCATION, sleep, timeout} from "../src";

class SwGlobalMock {
  db: Level;
}

async function test() {
  const {handle: handleFn2, swGlobal} = await prepareHandle();

  // simulates the code of the JsHandlerAPI.handle
  await doHandle(swGlobal, handleFn2);
  await doHandle(swGlobal, handleFn2);
  await doHandle(swGlobal, handleFn2);
  await doHandle(swGlobal, handleFn2);
}

async function prepareHandle() {
  await sleep(10);

  // simulates contract handle function
  const swGlobal = new SwGlobalMock();

  const handle = new Function(`
  const [swGlobal] = arguments;
  
  async function handle(state, input) {
     await sleep(1000);
     console.log('from handle:', await swGlobal.db.get('foo'));
  }
  
  const sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  return handle;
  `)(swGlobal);

  return {handle, swGlobal};
}

async function doHandle(swGlobal: SwGlobalMock, handleFn: Function) {
  const {timeoutId, timeoutPromise} = timeout(10);
  let now = new Date();

  // the kv storage
  const db = new Level(`${DEFAULT_LEVEL_DB_LOCATION}/kv/the_test_${now}`);
  swGlobal.db = db;
  try {
    console.log('======== Connecting to LMDB KV');
    await db.open();
  } catch (err) {
    console.error(err.code) // 'LEVEL_DATABASE_NOT_OPEN'
    if (err.cause && err.cause.code === 'LEVEL_LOCKED') {
      console.error('LEVEL_LOCKED');
    }
    throw err;
  }

  await db.put('foo', 'bar');

  try {
    // simulates calling single contract interaction
    await Promise.race([timeoutPromise, handleFn()]);

    // simulates 'commit'
    console.log('======== Committing');
    await swGlobal.db.batch([]);
  } finally {
    console.log('======== Disconnecting from LMDB KV');
    await db.close()
    clearTimeout(timeoutId);
  }
}

test().finally(() => {console.log('done')});
