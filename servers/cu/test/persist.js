import { readFileSync } from 'node:fs'
import * as assert from 'node:assert'
import { deflate, inflate } from 'node:zlib'
import { promisify } from 'node:util'

import PouchDb from 'pouchdb'
import PouchDbFind from 'pouchdb-find'
import LevelDb from 'pouchdb-adapter-leveldb'
import AoLoader from '@permaweb/ao-loader'

/**
 * A little playground for testing persisting process state array buffers
 * to PouchDB as attachments, compressed using zlib,
 * then retrieving from PouchDB, inflating, then passing array buffer
 * back to the process, and asserting everything lines up
 */

export function createPouchDbClient ({ maxListeners, path }) {
  PouchDb.plugin(LevelDb)
  PouchDb.plugin(PouchDbFind)
  const internalPouchDb = new PouchDb(path, { adapter: 'leveldb' })
  PouchDb.setMaxListeners(maxListeners)

  return internalPouchDb
}

const pouchDb = createPouchDbClient({ maxListeners: 50, path: 'foo' })

const handle = await AoLoader(readFileSync('./test/processes/happy/process.wasm'))

// Process the first message
const { output, buffer } = handle(
  null,
  {
    owner: 'foobar',
    tags: [
      { name: 'function', value: 'hello' }
    ]
  },
  {}
)
assert.deepStrictEqual(JSON.parse(output), {
  heardHello: true,
  lastMessage: {
    owner: 'foobar',
    tags: [
      { name: 'function', value: 'hello' }
    ]
  }
})

console.log(buffer.length) // ~16MB 🫠
const compressed = await promisify(deflate)(buffer)
console.log(compressed.length) // ~70KB 😎

// Persist in Database
console.time('put')
await pouchDb.put({
  _id: 'process_1,a',
  _attachments: {
    'buffer.txt': {
      content_type: 'text/plain',
      data: compressed
    }
  }
})
console.timeEnd('put')

// Retrieve from Database
console.time('get')
const fromDb = await pouchDb.getAttachment('process_1,a', 'buffer.txt')
console.timeEnd('get')
const inflated = promisify(inflate)(fromDb)

const newRes = handle(
  inflated,
  {
    owner: 'foobar',
    tags: [
      { name: 'function', value: 'world' }
    ]
  },
  {}
)
assert.deepStrictEqual(JSON.parse(newRes.output), {
  heardHello: true,
  heardWorld: true,
  happy: true,
  lastMessage: {
    owner: 'foobar',
    tags: [
      { name: 'function', value: 'world' }
    ]
  }
})
