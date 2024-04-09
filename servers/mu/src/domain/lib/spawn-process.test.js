import { describe } from 'node:test'
// import * as assert from 'node:assert'

// import { createLogger } from '../../logger.js'
// import { spawnProcessWith } from './spawn-process.js'

// const logger = createLogger('ao-mu:spawnProcess')

describe('spawnProcess', () => {
  // test('spawn process', async () => {
  //   const spawn1 = {
  //     tags: [
  //       { name: 'Data-Protocol', value: 'ao' },
  //       { name: 'Contract-Src', value: 'src-1' },
  //       { name: 'ao-type', value: 'process' }
  //     ]
  //   }
  //   const cachedSpawn1 = {
  //     id: Math.floor(Math.random() * 1e18).toString(),
  //     fromTxId: 'id-1',
  //     spawn: spawn1,
  //     cachedAt: new Date(),
  //     processId: 'pid-1'
  //   }
  //   const spawnProcess = spawnProcessWith({
  //     writeProcessTx: async (spawnData) => {
  //       // the program extracts this from the tag and puts it in src
  //       assert.equal(spawnData.src, 'src-1')
  //       /**
  //        * all tags should be removed in this case because they
  //        * would get duplicated by the sdk spawnProcess call
  //        * the program should only pass through tags that are
  //        * not built in part of ao
  //        */
  //       assert.equal(spawnData.tags.length, 0)
  //       return 'pid-1'
  //     },
  //     logger
  //   })

  //   const result = await spawnProcess({
  //     cachedSpawn: cachedSpawn1
  //   }).toPromise()

  //   assert.equal(result.processTx, 'pid-1')
  // })
})
