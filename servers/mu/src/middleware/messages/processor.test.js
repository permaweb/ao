// import { describe, test } from 'node:test'
// import * as assert from 'node:assert'

// import msgProcessor from './processor.js'

// describe('processor', () => {
//     test('valid run', async () => {
//         const tx1 = {
//             id: "txId1"
//         }
//         const tx2 = {
//             id: "txId2"
//         }
//         const tx3 = {
//             id: "txId3"
//         }
//         const db = {
//             updateMessage: async (msg) => {
//                assert.ok(msg, "msg should not be empty")
//                assert.ok(msg._id, "msg._id should not be empty")
//                assert.ok(msg.toTxId, "msg.toTxId shold not be empty")
//                return msg._id
//             },

//             findLatestMessages: async ({fromTxId}) => {
//                 assert.ok(fromTxId, "fromTxId should not be empty")
//                 return []
//             },

//             findLatestTx: async ({id}) => {
//                 assert.ok(id, "Id should not be eppty")
//                 return null
//             },

//             saveTx: async(tx) => {
//                 assert.ok(tx.id, "Id should not be empty")
//                 assert.ok(tx.contractId, "contractId should not be empty")
//                 assert.ok(tx.data, "data should not be empty")
//                 assert.ok(tx.cachedAt, "cachedAt should not be empty")
//                 return tx.id
//             },

//             saveMsg: async(msg) => {
//                 assert.ok(msg.id, "Id should not be empty")
//                 assert.ok(msg.fromTxId, "fromTxId should not be empty")
//                 assert.ok(msg.msg, "msg should not be empty")
//                 assert.ok(msg.cachedAt, "cachedAt should not be empty")
//                 return msg.id
//             }
//         }

//         const cuClient = {
//             messages: async function (cuAddress, txId) {
//                 assert.ok(txId, "tx id should not be empty")
//                 assert.ok(cuAddress, "cuAddress should not be empty")
//                 assert.strictEqual(cuAddress, 'http://localhost:3005', )
//                 if(txId === tx1.id) {
//                     return [
//                         {
//                             "message": {
//                                 "qty": 10,
//                                 "to": "ZDQhbUxi36wIkxIynsUrVBA4l_chgS4w4gcmHl9KRz4",
//                                 "from": "ATbFRaPkFJkuTXAsWMxlyi7CDuN6xgRTXWmjBvwunTc",
//                                 "type": "transfer",
//                                 "caller": "ATbFRaPkFJkuTXAsWMxlyi7CDuN6xgRTXWmjBvwunTc"
//                             },
//                             "target": "ZDQhbUxi36wIkxIynsUrVBA4l_chgS4w4gcmHl9KRz4",
//                             "txId": "z6crg_0i_GJAi8bnn5ojKgqCGOx2WdgL0U-obxB54Yw"
//                         }
//                     ];
//                 } else if (txId === tx2.id) {
//                     return [
//                         {
//                             "message": {
//                                 "type": "recieved",
//                                 "caller": "ZDQhbUxi36wIkxIynsUrVBA4l_chgS4w4gcmHl9KRz4"
//                             },
//                             "target": "ATbFRaPkFJkuTXAsWMxlyi7CDuN6xgRTXWmjBvwunTc",
//                             "txId": "vDAYKNApY4IVi7JckFWDWSQ_HSg6UvYly1Y4owgqufA"
//                         }
//                     ];
//                 } else if (txId === tx3.id) {
//                     return [];
//                 }
//             },

//             selectNode: async function (contractId) {
//                 assert.ok(contractId, "contractId should not be empty")
//                 return 'http://localhost:3005'
//             }
//         }

//         const sequencerClient = {

//         }

//         const tx = { txId: txid, contractId: cid, data }

//         const instance = msgProcessor.init({ db, cuClient, sequencerClient })

//         instance.process(tx)

//     })
// })
