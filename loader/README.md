# hyperbeam Wasm Loader

This module takes a hyperbeam wasm ArrayBuffer and returns a handle function.

## Usage

```js
import HyperbeamLoader from "@permaweb/hyperbeam-loader";
import fs from "fs";

const wasmBinary = fs.readFileSync("contract.wasm");

async function main() {
  const handle = HyperbeamLoader(wasmBinary);
  /* SmartWeave READ-ONLY Env Variables */
  const SmartWeave = {
    transaction: {
      id: "1",
    },
  };
  const result = handle({ balances: 1 }, {
    caller: "1",
    input: { function: "balance" },
  }, SmartWeave);

  console.log(result);
}
```
