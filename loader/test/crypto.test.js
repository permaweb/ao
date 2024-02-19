/* eslint-disable no-prototype-builtins */

import { describe, it } from 'node:test'
import * as assert from 'node:assert'
import fs from 'fs'

/**
 * dynamic import, so we can run unit tests against the source
 * and integration tests against the bundled distribution
 */
const MODULE_PATH = process.env.MODULE_PATH || '../src/index.cjs'

console.log(`${MODULE_PATH}`)

const { default: AoLoader } = await import(MODULE_PATH)
const wasmBinary = fs.readFileSync('./test/process/process.wasm')

describe('crypto', async () => {
  it('load wasm and hash message', async () => {
    const handle = await AoLoader(wasmBinary)
    const mainResult = await handle(null,
      {
        Owner: 'tom',
        Target: 'FOO',
        Tags: [
          { name: 'Action', value: 'hash' }
        ],
        Data: 'Hello World'
      },
      {
        Process: { Id: 'ctr-id-456', Tags: [] }
      }
    )

    assert.ok(mainResult.Memory)
    assert.ok(mainResult.hasOwnProperty('Messages'))
    assert.ok(mainResult.hasOwnProperty('Spawns'))
    assert.ok(mainResult.hasOwnProperty('Error'))
    assert.equal(mainResult.Output, 'vJ2q-OrRwXJMt2CnVmMVM2CeyYya5gUxUsAlIkxPMsM')
    // assert.equal(mainResult.GasUsed, 463918939)
    assert.ok(true)
  })

  it('load wasm and verify message', async () => {
    const handle = await AoLoader(wasmBinary)
    const mainResult = await handle(null,
      {
        Owner: 'tom',
        Target: 'FOO',
        Tags: [
          { name: 'Action', value: 'verify' },
          { name: 'PublicKey', value: 'o3NJER9I0_C0PIOGy6jaklf9kUi2TsCaMzNVUk9SfSvRJnMnvfn4mfmYNU1XkV7FXdjIJjdMK0fEDo6PpCm1QgThhNhzMx9vBQrFX6i4bGn8OR54rx_LwdCZNBSB_Lgt2HcPx7G6EQ8hK2lXmPFv-rCZbTZJnJsbOp0RctqYz5wOxvhIi6QI_rEcjB_Ded6iU7EwchHnrvBGfqh-D-blvctzWK9zGAnb5j3wvMXHYoafSiW_6t4qL3ycqSZfkteyu3AnzNA-mZ00BcNdiWj_6VjoXY5y-hJJnvO5eDgqRM0eesOS8IOBvkNdejdE_d7x_HWjC5XocIyFxmLV_NRIs_gc8FbPZYd6xgplfeSEdU4is2WqRaB2n1vNu_FSut0XN_C2tr9CyiUASCy0pAxxwJM4NJ55idy1-U76nyAGd2knH_YUpktp56Rwf8WmSeEJSgASRsSA-g0WVi-ciImdenfMVH2u4VqWZFGQZNHIN6-zXZexZZiEcHPD-rNix7Vu07p8A01qZBI3w1hB0amZJ-AXZSXpCdiyjHsAT8jbntFFla77xRPdm9zn6MVBGOFbbmX7a9Wq2ljzXHRDlg3WgxGS6ZgAMTn3mDzVJLTeLButbbP9D_JQSCsWMFgZBB6iDLwdr2hPIi2TV9oHl6AYy4sTFzMkpJgbMDdkm7vX02c' },
          { name: 'Sig', value: 'Nl9RB1jNGfZ1VTWu_pRCUbvJYGpkDi9ymTAS3JdxBFEasruSpb9MopAfNNv9Tqxd9qGiS1iwvDqjlb_mdPwcUIeC6r9XYCbtmjOsV0wVoqwOlgVzbmaO_XhQRSvdg2FjVdknVOA0cH-MQXBPn1CimoDREbFYt87owg9R4W7GT3M0MHry8vZzf1-reIO19JxunWS6JsOHHGXTZ5LJCxvS4pdQK5H2cYjuJsSsEQZIwHKGaWGj1JqG9RjASjLImd1GwAL8uGfQ4QBDXTBEbvohWMOm7bmqiUGRwcbFqJr8hM8QCauRBHMJNt4iyJU4Oe_FJQugkDSJz4nIK3Xp06MWddAgh_Ls4Mxj4PbP0sw-5zejdtyHf6qlPjK7cVU8s8u3jiYPYrq3oQMv4iTTXGlkeQdDMqLDUS9JjpS_8yq3Wx-8L6hNYzBlKCivj2Hn_4INU4Pn0E7syE5Q-mW7c_OI3G1Pu074RLziY9oIeaDPNHEfZWxmltY2nJMXfJXJsOVoNwxA33lSlOBG544lyH_h2U6PD4_K_l5mPuwPdeVi0Z_94jdPBrBIoOxri7-WjY5zEuoge4KYk2m-QUVBqmaM4Ff_ml_c1Zx2is4PhSSTTL0gqF17L9_15phBWdFAHRrGmDOp4whQ5nl7aovvQAo3uB_-ZZiVJy1cqACC8YsquAU' }
        ],
        Data: 'U_6BGEZsmSXRMc8uUUWoXZH2Zd5daSgeZvVHelroP5l8o5tWS5novs0RhEdgGgWP'
      },
      {
        Process: { Id: 'ctr-id-456', Tags: [] }
      }
    )

    assert.ok(mainResult.Memory)
    assert.ok(mainResult.hasOwnProperty('Messages'))
    assert.ok(mainResult.hasOwnProperty('Spawns'))
    assert.ok(mainResult.hasOwnProperty('Error'))
    assert.equal(mainResult.Output, true)
    // assert.equal(mainResult.GasUsed, 463918939)
    assert.ok(true)
  })
  it('load wasm and not verify message', async () => {
    const handle = await AoLoader(wasmBinary)
    const mainResult = await handle(null,
      {
        Owner: 'tom',
        Target: 'FOO',
        Tags: [
          { name: 'Action', value: 'verify' },
          { name: 'PublicKey', value: 'o3NJER9I0_C0PIOGy6jaklf9kUi2TsCaMzNVUk9SfSvRJnMnvfn4mfmYNU1XkV7FXdjIJjdMK0fEDo6PpCm1QgThhNhzMx9vBQrFX6i4bGn8OR54rx_LwdCZNBSB_Lgt2HcPx7G6EQ8hK2lXmPFv-rCZbTZJnJsbOp0RctqYz5wOxvhIi6QI_rEcjB_Ded6iU7EwchHnrvBGfqh-D-blvctzWK9zGAnb5j3wvMXHYoafSiW_6t4qL3ycqSZfkteyu3AnzNA-mZ00BcNdiWj_6VjoXY5y-hJJnvO5eDgqRM0eesOS8IOBvkNdejdE_d7x_HWjC5XocIyFxmLV_NRIs_gc8FbPZYd6xgplfeSEdU4is2WqRaB2n1vNu_FSut0XN_C2tr9CyiUASCy0pAxxwJM4NJ55idy1-U76nyAGd2knH_YUpktp56Rwf8WmSeEJSgASRsSA-g0WVi-ciImdenfMVH2u4VqWZFGQZNHIN6-zXZexZZiEcHPD-rNix7Vu07p8A01qZBI3w1hB0amZJ-AXZSXpCdiyjHsAT8jbntFFla77xRPdm9zn6MVBGOFbbmX7a9Wq2ljzXHRDlg3WgxGS6ZgAMTn3mDzVJLTeLButbbP9D_JQSCsWMFgZBB6iDLwdr2hPIi2TV9oHl6AYy4sTFzMkpJgbMDdkm7vX02c' },
          { name: 'Sig', value: 'l9RB1jNGfZ1VTWu_pRCUbvJYGpkDi9ymTAS3JdxBFEasruSpb9MopAfNNv9Tqxd9qGiS1iwvDqjlb_mdPwcUIeC6r9XYCbtmjOsV0wVoqwOlgVzbmaO_XhQRSvdg2FjVdknVOA0cH-MQXBPn1CimoDREbFYt87owg9R4W7GT3M0MHry8vZzf1-reIO19JxunWS6JsOHHGXTZ5LJCxvS4pdQK5H2cYjuJsSsEQZIwHKGaWGj1JqG9RjASjLImd1GwAL8uGfQ4QBDXTBEbvohWMOm7bmqiUGRwcbFqJr8hM8QCauRBHMJNt4iyJU4Oe_FJQugkDSJz4nIK3Xp06MWddAgh_Ls4Mxj4PbP0sw-5zejdtyHf6qlPjK7cVU8s8u3jiYPYrq3oQMv4iTTXGlkeQdDMqLDUS9JjpS_8yq3Wx-8L6hNYzBlKCivj2Hn_4INU4Pn0E7syE5Q-mW7c_OI3G1Pu074RLziY9oIeaDPNHEfZWxmltY2nJMXfJXJsOVoNwxA33lSlOBG544lyH_h2U6PD4_K_l5mPuwPdeVi0Z_94jdPBrBIoOxri7-WjY5zEuoge4KYk2m-QUVBqmaM4Ff_ml_c1Zx2is4PhSSTTL0gqF17L9_15phBWdFAHRrGmDOp4whQ5nl7aovvQAo3uB_-ZZiVJy1cqACC8YsquAU' }
        ],
        Data: 'U_6BGEZsmSXRMc8uUUWoXZH2Zd5daSgeZvVHelroP5l8o5tWS5novs0RhEdgGgWP'
      },
      {
        Process: { Id: 'ctr-id-456', Tags: [] }
      }
    )

    assert.ok(mainResult.Memory)
    assert.ok(mainResult.hasOwnProperty('Messages'))
    assert.ok(mainResult.hasOwnProperty('Spawns'))
    assert.ok(mainResult.hasOwnProperty('Error'))
    assert.equal(mainResult.Output, false)
    // assert.equal(mainResult.GasUsed, 463918939)
    assert.ok(true)
  })
})
