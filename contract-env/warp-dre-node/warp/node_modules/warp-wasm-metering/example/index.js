const fs = require('fs')
const metering = require('../')

const wasm = fs.readFileSync(`${__dirname}/fac.wasm`)
const meteredWasm = metering.meterWASM(wasm, {
  meterType: 'i32'
})

const limit = 90000000
let gasUsed = 0

const mod = new WebAssembly.Module(meteredWasm)
const instance = new WebAssembly.Instance(mod, {
  'metering': {
    'usegas': (gas) => {
      gasUsed += gas
      if (gasUsed > limit) {
        throw new Error('out of gas!')
      }
    }
  }
})

const result = instance.exports.fac(6)
console.log(`result:${result}, gas used ${gasUsed * 1e-4}`) // result:720, gas used 0.4177
