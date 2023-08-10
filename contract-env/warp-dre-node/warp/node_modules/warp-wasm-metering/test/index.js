const fs = require('fs');
const tape = require('tape');
const metering = require('../');
const defaultCostTable = require('./defaultCostTable');
const toolkit = require('warp-wasm-json-toolkit');

tape('basic test', (t) => {
  const json = JSON.parse(
    fs.readFileSync(`${__dirname}/in/json/basic.wast.json`).toString()
  );
  const wasm = toolkit.json2wasm(json);

  const meteredWasm = metering.meterWASM(wasm);

  const meteredJSON = toolkit.wasm2json(meteredWasm);
  t.equals(meteredJSON[2].entries[0].moduleStr, 'metering');
  t.equals(meteredJSON[2].entries[0].fieldStr, 'usegas');
  t.equals(meteredJSON[1].entries[1].params[0], 'i32');

  t.end();
});

tape('basic metering tests', (t) => {
  let files = fs.readdirSync(`${__dirname}/in/json`);
  // files = ['zeroCostOps.wast.json']
  for (const file of files) {
    console.log(file);
    const json = JSON.parse(
      fs.readFileSync(`${__dirname}/in/json/${file}`).toString()
    );
    let costTable;

    try {
      costTable = require(`${__dirname}/in/costTables/${file}.js`);
    } catch (e) {
      costTable = defaultCostTable;
    }

    try {
      let meteredJson = metering.meterJSON(json, {
        costTable,
      });

      let expectedJson = require(`${__dirname}/expected-out/json/${file}`);
      t.deepEquals(
        meteredJson,
        expectedJson,
        `${file} - should have the correct json`
      );
    } catch (e) {
      t.equals(file, 'basic+import.wast.json');
    }
  }
  t.end();
});

tape('wasm test', (t) => {
  const json = require('./in/json/basic.wast.json');
  const wasm = toolkit.json2wasm(json);

  const meteredWasm = metering.meterWASM(wasm, {
    meterType: 'i32',
    fieldStr: 'test',
    moduleStr: 'test',
  });

  const meteredJSON = toolkit.wasm2json(meteredWasm);
  t.equals(meteredJSON[2].entries[0].moduleStr, 'test');
  t.equals(meteredJSON[2].entries[0].fieldStr, 'test');
  t.equals(meteredJSON[1].entries[1].params[0], 'i32');

  t.end();
});
