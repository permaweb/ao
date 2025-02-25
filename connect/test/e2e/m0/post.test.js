import { test } from 'node:test'
import * as assert from 'node:assert'
import { connectWith } from '../../../src/index.common.js'
import { WalletClient } from '../../../src/client/node/index.js'
import { createSigner } from '../../../src/client/node/wallet.js'

// this is a test wallet do not use for anything other than testing
const WALLET = {
  kty: 'RSA',
  n: 'x5wjDziDSmSCvrWTiWk4avD-2DmolJHV6FOqwX8Dv4qvAJUDLq8kGg4r5NGj6yWS_f1N58FyhuAKcNgwBBj5Api5Kx5siL3vvcGywUaIID4wSn0BBjiTOf-IyEp0Ch4esGcf5fxNTzhX5X_2V8uPeXCGI-fbm877swOtgDSPc-ICAbML_CI0lOE60IP-KuWG7N0nsfibfDKs5fDv-JJTl21Dzxdryq44O873Kuyg9uOYIBW454UyBAYNMlSoMO753oLJvQvKi5n5X3ldnexD9bAwSzrjx1uhmtEr98ffxuplwsu0RkBOfolZS7GrD1mA_9zWKba-rreTus69gvbjSnHcQOkn6w11mGlL0_v95CN4kmthxlhuxPQS2R1pdkNYiX9IuULZcet-CO9Cnm6YDsNyvc84ly-iniUUR9Op2DWLzMuwNz9V-qJioKmGWmVE8V3tcu8RheAXnc2EoNwp3nhwV9a0GTcmrH7Dbpk-i60x75raxAYi5w_NAp44jddxueyxthW-3uyQmVtq_t-j1lMmrInTtRoIXi84bfZYzsxDqzx4E56xB2I7wQcOg2JSzLNVmzo6x2gVUSb9K2yCoIgM55eTdSS7sFG_fT60ftvR-RJR4fOpMHbMA8-aOcs6CLgKxFaVrVEWcSKpodKl_wjXXYJnPZE-xrXRyVwtx-c',
  e: 'AQAB',
  d: 'QMVnkv7Ri4hF7MBa2ZHtHraI230KOPuBn9vWYudmPfcwhk3UNIfcfR_wGlX0jM8qfYR-jR92nFGC0c809X9s_ey02UsMCOspKjf6W0EZ1uyXGvSpKm2dSIqkxely8f2IE9HCxgwywewUiYIWW7LQIaXjwS7xUgO-JP6ihCGKEx5ZbFe_IdevnEfhn9vU0_Ka761rvhJf0dNXy119YPmKam6oPEDrV19lG_MyvRj_ul1r9a1WzLmp2yhji9twoEBLkGp8L_3tgZM7GkH1oNMT0luTsDWxx_Tx4ZzSWZrgAFn7H1SecNVZIzJKaYeDbH2soFn2nJ6SDXvAUjPXxvF6GxCBp5I40mSaQW8CppI-ZWw1dbxMRjv2IQHAxsMN_TM-vk0YmjrzOr5SVWkZ3Eib6nor8kP9g0fdsA7Wlhocop8JhjdQ7XDxm0n-VLg75Wnk0o4hnmvYq5jnJg5k6mE0mBQ15mBgC8MhPZTb9VLySl_CXsXzLdT0UuOKpDGbHiWdVjT3Yo_afZt75vzQ0ys1Y5AILlFlibRyVOLnT2YE6906U3DkQLWYTs6XGWiYYS7rDPnZc24xhTj3WtCubINBOCfbcU558klgxM2Mp-TbFvLu0WPy-neeMopCsLbf-sBjWSdGE3RNSV9IuJWV4rQ2XEvtz4xS_E5-9BGw3IW-eaE',
  p: '-3KdF6fI22lJ9Kv0HPMJmB4I3KgHgSpnkx99MirabiEFq3Trd5B_6iIeaCz3IKaPMvpujRTmJatNLaw2KNhtETaHQqJhw-_X82CJaYVJSFrmjnltD7dUIJW3LLokq4F7YiObd_oGWb75YKLx8WobX7E4BJd-8Bbcz2LsReYBLim6KKzzQPIw-uXfMcF_pnWA7W7S5JSBKtp458Mo6MYITlv4iAhU5cgXvZiURa57I7woTuSgl9Pmzn_ZR83tbmXK6EJA5J2nzavUgUTOaBmCkNGWztDvsb3XUwtcW48RQgDoHP6dlS4ZX7qBt5shvkDADj4Rc-X-V0pbqkWLCLKRvw',
  q: 'yzlFM4JXVpBEO2s_2fmMDKGP6p-d2pv3M54-hjBHyvYOy8Zs_WrrlRm12zDXvV1YfOpHswKk3SxO9jgTAdHd_QPnXTKpO15IriuKhODPK9zRsM1pEm2tskfdv-KsE2TKULVWxBsS_sMn4pGFgTFIrE4aXezvnWBU_DBO31lRWnBHxflCJ3zl68YxNbn3Er--R4GBpyBle500-tiONDYh4eoY_TKlG3b6x4x4n1u5qz2WGr1VKhUro5GFvTj0WRlZvYGXMfIoTqu5dEApMsfRPq1qAcWU-tzy6FF1nwjypkgbr8lCcDYhNr64eRyCUUuArcVi84iIzxD3KNx2S6UD2Q',
  dp: '1f1ej-ks2P2sANvuLkzvl1PIOvGNIXHTH7QmufEaX6sexiIE2oZRNhK_Se0qi9D0AXB7cPmeO-SjFAGBPhWiDIoZZq4HAdc2M1uu1eymxzsFB69zD3L315tSfnAUERlqxcSD5QEVMn-Cf6lsugWRMkkB4XaEgxMR7DTF2165Fm5QjZlSk60J3hyPbCq-1g0eIfK06-8uVigDyUmfoSoXm4hN5IciqUM2YRZe6UZqaakRrMKJoWym-op3gdJRBCkBG9R2oZlCW5imizThbFp5cYHNFElgFCX6ACSk_w6soz1eTH6r4W-QDJYPGxCdEOrOB9DuzXGomOUhSbFRd59wxQ',
  dq: 'GmasSM7MDeDcHGQIfYbf3Nw4WCC4XygX60rJkKFBEmr47RwwGJQFWu9mIr2rqVwxHLlK60SSqnERKQeL4JalIjOZoQ_t0FqlUosxiaWzBF3BmBh3Z_97q0eO1VjbRgG4DtggF4X058furI5_K5N9f3T-E-muD2HuaHzWIkn2OauQh3WkVIDzVbf_uJ0aLgNe8ucuMsoQpQh9U4FCqCHIMRM6f9pOfMzuM3JaUUmXS1nK4Fpsb_UkIDHNkBGQHOsgL3BgdgqhlebVRvb24zP2SRA6T1Sd0CFYJTo_75M4AsYnYqTgzrcZhYUtbf54J5uJcgnMmxrHuy7XDSXm8FjVsQ',
  qi: 'HJhf2ZP_PczoOoEMAw3cN6wdrZLG9J465tDjZ4HYqL9vrzPs7fPrXWJo4-WA-p_2IDXCkMP_t6H6JFyK1xHmDmjNpP7XlTwBb_hcEgn0W3dvmZ597Ey-B38IZfn0J4Wq3s34kcq3tprB5rG08qTm4d_tG-sln8Z7Ey-bLKTWPL_kIqpTCJ0H7cGvFVRMGN2dc9nPb4MYFRXhxZS7JF4SQJyRwPuHEMsY97Ph2IpNYpxKTGR1LfqWwSwnwrfyY_Y8sgkHMSNDvZcdGmaEYxhzTXa9xFGUdEFn2IAUIdvVz0aCBqC0soyfrkF955SDbCkbD2QxhyLX1DBVBcw_HEUCRA'
}

test('post: connectWith use mainnet device=relay@1.0 mode to dryrun on a process', async () => {
  const connect = connectWith({
    createDataItemSigner: WalletClient.createSigner,
    createSigner: WalletClient.createSigner
  })

  const { post } = connect({ MODE: 'mainnet', signer: createSigner(WALLET) })
  const Ticker = await post({
    Target: 'WWjq4e5Oigct0QfBPdVF6a-zDKNMRoGPAojgv5yFcLU',
    Action: 'Info',
    dryrun: true
  }).then(map => map.Messages[0].Ticker)

  assert.equal(Ticker, 'PNTS')
})

test('post: connectWith use mainnet device=relay@1.0 mode to message on a process', async () => {
  const connect = connectWith({
    createDataItemSigner: WalletClient.createSigner,
    createSigner: WalletClient.createSigner
  })

  const { post } = connect({ MODE: 'mainnet', signer: createSigner(WALLET) })
  const Error = await post({
    Target: 'WWjq4e5Oigct0QfBPdVF6a-zDKNMRoGPAojgv5yFcLU',
    Action: 'Transfer',
    Quantity: '10000',
    Recipient: 'cHencOZC-aCbPCDH2tEZ3Lhw3EM5oRw3kxgj-eEgtNc'
  }).then(map => map.Messages[0].Error)

  assert.equal(Error, 'Insufficient Balance!')
})

test('post: connectWith use mainnet device=relay@1.0 mode to spawn a process', async () => {
  const connect = connectWith({
    createDataItemSigner: WalletClient.createSigner,
    createSigner: WalletClient.createSigner
  })

  const { post } = connect({ MODE: 'mainnet', signer: createSigner(WALLET) })
  const process = await post({
    Type: 'Process',
    Name: 'MyNewProcess',
    Module: 'JArYBF-D8q2OmZ4Mok00sD2Y_6SYEQ7Hjx-6VZ_jl3g',
    Scheduler: '_GQ33BkPtZrqxA84vM8Zk-N2aO0toNNu_C-l-rawrBA'
  })
  // .then(result => result.Output.text())
  // console.log(result.Output.text())
  // .then(map => map)
  assert.equal(process.length, 43)
})
