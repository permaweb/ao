# Details

Date : 2023-08-03 12:42:12

Directory \\\\wsl.localhost\\Ubuntu\\home\\vince\\arweave\\beam\\hyperbeam\\contract-env\\warp-dre-node\\src

Total : 33 files,  1634 codes, 53 comments, 256 blanks, all 1943 lines

[Summary](results.md) / Details / [Diff Summary](diff.md) / [Diff Details](diff-details.md)

## Files
| filename | language | code | comment | blank | total |
| :--- | :--- | ---: | ---: | ---: | ---: |
| [contract-env/warp-dre-node/src/config.js](/contract-env/warp-dre-node/src/config.js) | JavaScript | 158 | 0 | 11 | 169 |
| [contract-env/warp-dre-node/src/configValidator.js](/contract-env/warp-dre-node/src/configValidator.js) | JavaScript | 11 | 0 | 2 | 13 |
| [contract-env/warp-dre-node/src/db/00001_unique_contract_tx_id.sql](/contract-env/warp-dre-node/src/db/00001_unique_contract_tx_id.sql) | SQL | 40 | 7 | 12 | 59 |
| [contract-env/warp-dre-node/src/db/00002_cleanup_indices.sql](/contract-env/warp-dre-node/src/db/00002_cleanup_indices.sql) | SQL | 6 | 1 | 6 | 13 |
| [contract-env/warp-dre-node/src/db/nodeDb.js](/contract-env/warp-dre-node/src/db/nodeDb.js) | JavaScript | 242 | 9 | 31 | 282 |
| [contract-env/warp-dre-node/src/listener.js](/contract-env/warp-dre-node/src/listener.js) | JavaScript | 323 | 4 | 44 | 371 |
| [contract-env/warp-dre-node/src/logger.js](/contract-env/warp-dre-node/src/logger.js) | JavaScript | 10 | 0 | 3 | 13 |
| [contract-env/warp-dre-node/src/router.js](/contract-env/warp-dre-node/src/router.js) | JavaScript | 19 | 0 | 4 | 23 |
| [contract-env/warp-dre-node/src/routes/blacklisted.js](/contract-env/warp-dre-node/src/routes/blacklisted.js) | JavaScript | 10 | 0 | 2 | 12 |
| [contract-env/warp-dre-node/src/routes/cached.js](/contract-env/warp-dre-node/src/routes/cached.js) | JavaScript | 15 | 0 | 4 | 19 |
| [contract-env/warp-dre-node/src/routes/contract.js](/contract-env/warp-dre-node/src/routes/contract.js) | JavaScript | 79 | 0 | 5 | 84 |
| [contract-env/warp-dre-node/src/routes/eraseContract.js](/contract-env/warp-dre-node/src/routes/eraseContract.js) | JavaScript | 56 | 0 | 5 | 61 |
| [contract-env/warp-dre-node/src/routes/errors.js](/contract-env/warp-dre-node/src/routes/errors.js) | JavaScript | 10 | 0 | 2 | 12 |
| [contract-env/warp-dre-node/src/routes/kv.js](/contract-env/warp-dre-node/src/routes/kv.js) | JavaScript | 24 | 1 | 4 | 29 |
| [contract-env/warp-dre-node/src/routes/scheduleSync.js](/contract-env/warp-dre-node/src/routes/scheduleSync.js) | JavaScript | 33 | 0 | 8 | 41 |
| [contract-env/warp-dre-node/src/routes/state.js](/contract-env/warp-dre-node/src/routes/state.js) | JavaScript | 39 | 0 | 6 | 45 |
| [contract-env/warp-dre-node/src/routes/status.js](/contract-env/warp-dre-node/src/routes/status.js) | JavaScript | 42 | 2 | 8 | 52 |
| [contract-env/warp-dre-node/src/signature.js](/contract-env/warp-dre-node/src/signature.js) | JavaScript | 24 | 0 | 6 | 30 |
| [contract-env/warp-dre-node/src/tools/appSyncInteractions.js](/contract-env/warp-dre-node/src/tools/appSyncInteractions.js) | JavaScript | 21 | 0 | 4 | 25 |
| [contract-env/warp-dre-node/src/tools/appSyncSubscribe.js](/contract-env/warp-dre-node/src/tools/appSyncSubscribe.js) | JavaScript | 24 | 0 | 5 | 29 |
| [contract-env/warp-dre-node/src/tools/cacheSafeContracts.js](/contract-env/warp-dre-node/src/tools/cacheSafeContracts.js) | JavaScript | 19 | 1 | 5 | 25 |
| [contract-env/warp-dre-node/src/tools/cacheSafeContractsStreamr.js](/contract-env/warp-dre-node/src/tools/cacheSafeContractsStreamr.js) | JavaScript | 37 | 2 | 6 | 45 |
| [contract-env/warp-dre-node/src/tools/generateArweaveWallet.js](/contract-env/warp-dre-node/src/tools/generateArweaveWallet.js) | JavaScript | 20 | 0 | 3 | 23 |
| [contract-env/warp-dre-node/src/tools/maxStateSizeTest.js](/contract-env/warp-dre-node/src/tools/maxStateSizeTest.js) | JavaScript | 18 | 0 | 5 | 23 |
| [contract-env/warp-dre-node/src/tools/migrateToDividedCache.ts](/contract-env/warp-dre-node/src/tools/migrateToDividedCache.ts) | TypeScript | 45 | 9 | 11 | 65 |
| [contract-env/warp-dre-node/src/tools/pruneShit.js](/contract-env/warp-dre-node/src/tools/pruneShit.js) | JavaScript | 10 | 0 | 4 | 14 |
| [contract-env/warp-dre-node/src/tools/publishTest.js](/contract-env/warp-dre-node/src/tools/publishTest.js) | JavaScript | 12 | 6 | 6 | 24 |
| [contract-env/warp-dre-node/src/tools/readState.js](/contract-env/warp-dre-node/src/tools/readState.js) | JavaScript | 25 | 8 | 7 | 40 |
| [contract-env/warp-dre-node/src/tools/rewrite.js](/contract-env/warp-dre-node/src/tools/rewrite.js) | JavaScript | 44 | 1 | 12 | 57 |
| [contract-env/warp-dre-node/src/warp.js](/contract-env/warp-dre-node/src/warp.js) | JavaScript | 80 | 0 | 4 | 84 |
| [contract-env/warp-dre-node/src/workers/common.js](/contract-env/warp-dre-node/src/workers/common.js) | JavaScript | 64 | 0 | 6 | 70 |
| [contract-env/warp-dre-node/src/workers/registerProcessor.js](/contract-env/warp-dre-node/src/workers/registerProcessor.js) | JavaScript | 39 | 1 | 5 | 45 |
| [contract-env/warp-dre-node/src/workers/updateProcessor.js](/contract-env/warp-dre-node/src/workers/updateProcessor.js) | JavaScript | 35 | 1 | 10 | 46 |

[Summary](results.md) / Details / [Diff Summary](diff.md) / [Diff Details](diff-details.md)