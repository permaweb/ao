import { test } from 'node:test'
import * as assert from 'node:assert'
import { connectWith } from '../../../src/index.common.js'
import { WalletClient } from '../../../src/client/node/index.js'
import { createSigner } from '../../../src/client/node/wallet.js'

const WALLET = {
  kty: 'RSA',
  n: 't1OhTE-r39pXsrgdsNRXEZyMIAIID2htI6-XmPaRcJXH6vqtbBgW0Vkzx7-bbTiteQdpJiLe6yQM4kT3QyE84L0XnHgHVB0-0QYvOZJIsOTK-7ZTKstHBu0rPNNRpI2XvzKuu2BUDuEYfpGc__1gqi_x7LSyygQuHZZse5MtBPJpHLC5UPOiTYtMxe-NTipM27ctMNFfSIEFw5JOZLKCtFqZpudu0tJ0wMxvV-uE8gXUsvzlDjLUYNM7BenA8otpChnnA-ihjJop_f47JKNbb6WzuNOG7LXHNdC7zcK2MpFTtb387Csu_rJxnZAjwmdlThKHbNkbSHKFeZNxOr_9s2D66hUDLAp0IbwKOJAmIczleRKih_QEytXsJCm3ztkOaGI6xdzjgtaA490zL6jncKeRbss809Ek-iYi9OzurRQXbiJENSMQCzx1RjZG-x4MymyFWK92JsJAx6ux15bW7YI_Fo1u6dELr0c6Id3B3LbkXw3QL3erWaLrucOo0h1f83RDwZrT9GKD9zBnLWXFPyKplyY0PcPjx5AFeFaE1jtP8RZpErqES_v3f5SAZKTx_SQHjs3HGSKkoFL7U457jfT6MSddRPAddzPcRVVJ5TS2spEOyqsD158DUNxa25k42Wg2zmYZ6inxCt6hAUsL7xUpa9A4NmCb4U1n7v7vNqk',
  e: 'AQAB',
  d: 'IB9vznrRX4aXQlIfpbn3Tbc0GHGyrtx57zxX4G4n-uXL44EsPRoVeXZba99HoUJCp0fkpVGL5QDqnwU9nE4pKCoKBplDk3oSZTbjtH9M7G4SoTuH5CI9XlnVbzGKBz7mPZLoah3NbNQFYjwqmfJwazG-ft8EywAjgny2ooqd41WElInk1unx4QuNFsvMY0tnL0KwEPNG8mHlPCkZQmzDGU4cyVGZKijFW3kW831pzKy34esNSckfTJ4GpBka_YTvEV2LjLRJBmWHASH4hAl5vpz22mZ6KGULtILQPZQmL8MmO1zAgjNo5ykmXlkA4xIR_rWhdDGwpaeneq-ashQtJGLQHpsy32IQq5jqQLZlyFz4U9jZpzIA1mdJImJJBWjIREgwsTv5w7eCz-Bv9kR53CklG5yZuidOIwTqJ0mGnfvUSPSQo9OdmpivZgSbCqOYel9hudkKKKTNVMmulsZ5Qb1B_PvgwY7UWZfuFMJZWT5v_MI9fKfEL1gUW1Ig9zKqW-QNvIxS_MddXJ0YK42VCb2A3DB7dEsMsVmZs_3oBdOS0uSLhtA6s9Hpp2VGZwUVOyAWLraYv2yIW8X5_emShH4AsyUE3nXTlCxx9yaTE9I0YvFQ5DQiDKkzKnrLumHB6ZXi348pN0qUK7AmbBxgDm4jkvq7kubmblGiUKtNgW8',
  p: '49cU4_DkYQGLJzSFEe4hk3ITEC4SbLkX91jaUXtk-TO4IdWLgWb0smq8sKzwGEB7EbogaU10Tg4Hr2rGHIY4vNK_9GfO5yKSAWP-dJi1b5u4EzOqDW_FuRWVIRjDEQnoaXSmpKHHk6w9mSAEKNtPmADzOKZfZyzcufvoE4hUG3t07eLhDu9LC_Ib7RjSXMzkUXdUZpg_TuDOzXTBvjBi49kSteWZgP6txd8K6cyo1vlPdeOrfinfR-nKDj-KpvWgbaei7oZqeaRfQdANnoWDd9TLDdNEkSKruzBWd-b_3yVD7FzbGXT4yAT_9iffZlexzdQlwoqu5Dp0_eTZDROJ6w',
  q: 'zfwhiaFXrkL9RYJM_LVhmA6xz_66wWa7GpkXiupTsopD_Ly3y6cvn8-tOfh46jBHvtqZjKbZSTuzaEI6FEIqkFqzCtY0UI-r8MbUKwNepXdZCuyOgMOKfYEq9icQdsZWpM6fcNOzTv9Ug8lKAQzy2QR0cZvupQM9SpYPI3mUDVazA_Cp7Xfeu5vmYHspNHNIEWXDmsz3GbByIH67ZY69ve4aTZmRpAxJvbnQ0N84bAWrp9jD9gUh7YzDER6iP0T3DBVTL4gdj1b_Ig1iyGglvdBpjbEKSTlVSD8EM7zxBFD4hjftWK_9dWsBcAiXnYTtV9_SM6cM16ECMfW7KmZouw',
  dp: 'VnGHMoh2DbwJMMHDby8bPBb-1pe0U93SEv16L4oSoF4YEXY07M7ELmFC4AFtQrZMO0iT_X_ujaLTFaH8MlxWcIXBYJh2Lsm1_aMTquc5h3PcXiSu81Qh_3wJzbnYYMGSlVg11aav0v55jHxSN7Ilu7U4kpjE_59My5-gyLBjwN2RWqRG4WS243xjTgyp2529To9ozVgcRPAUZm1TCLbQ_kOgzrSjDgcSpU1flZ8ZvB5xIHhV25NFbMJt8AP5tijhSllc_wSupyJPJegrEqbzX2az97XdgPdXkrjfRbS2BdLct3PviPQRY8pJ1vn_z5OcGUzRWsNFYcAwHRhTpZtxKw',
  dq: 'x4alDeYFQr2NC9mNrXQc1ufVAX7jdBeIwdjtXxhgfp9D__rlphWKIilOyMqQhXjC5nJlLkMoUrHLtQABtkHpbO8OYz7eafLhQFe4iPm4olsbG2PNHZlL-wo1jT6FyieRIg8rjmTiWXEmcol2b9IVInYYPTwoTBr5MdhtTZWk_c6vlO94CpiEXgJDg82JOk84zfFfKgHEkVPDGQrphxRfYyzSubw5wUhN3cOyK8EtrCVKA0oLd7G9DZe-FEUyMEsjasb1TyNwTrqcZGXG_A02EclhlWiaaBdrLpIsBdnNNLsiIRDnjXLb9vLx743DH0f1h5s8x9_WpsBFmhNHe2i7pQ',
  qi: 'G3N8v42TYSw-q3eKTJ4IhcY2IOEGBRpV7CgevtqGlfnCjPUezlwtuqVh3tFIVMryK7HMLsqWdvzRNrOhq3Kg2JrQR1Q-gbDS0brCcGfOPCDKRM1SwC8hzeqLBzRItxj7IoPR3XKBGtUWoR_AKfM0t8ewOzLm5w1OYMAOtfu8inzNU7FHoIK-yc1oB4ox0gHId7-lg0wK3mhCSQxEGO0K6W5f99joHwQ2IQ7_nx_2-s0PEFQ0759LXUkQT3RzWQk__MZ2G2y9dLF7AHJSO4m4XF3uPuH5fKJjjcyKbn8HdsdgIseHEaTr7g00JR1psfOHQqMMR5HPEg73tXgmKy6t7w'
}

test('get: no funds for message', async () => {
  const connect = connectWith({
    createDataItemSigner: WalletClient.createSigner,
    createSigner: WalletClient.createSigner
  })

  const { get } = connect({ MODE: 'mainnet', signer: createSigner(WALLET) })
  try {
    const Ticker = await get({
      Target: 'WWjq4e5Oigct0QfBPdVF6a-zDKNMRoGPAojgv5yFcLU',
      Action: 'Info',
      dryrun: true
    }).then((map) => map.Messages[0].Ticker.text())

    assert.equal(Ticker, 'PNTS')
  } catch (e) {
    assert.equal(e.name, 'InsufficientFunds')
    assert.equal(e.price, '3')
  }
})
