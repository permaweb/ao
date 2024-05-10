// this step will need to be invoked after the wasm file is compiled and it will load it and add
// the metering functions to the wasm and replace it.
const fs = require('fs')
const metering = require('@permaweb/wasm-metering')
const wasm = fs.readFileSync('/src/process.wasm')
fs.writeFileSync('/src/process.wasm', metering.meterWASM(wasm))
