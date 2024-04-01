import { test } from 'node:test'
import * as assert from 'node:assert'
import fs from 'fs'

const MODULE_PATH = process.env.MODULE_PATH || '../src/index.cjs'

const env = {
  Process: {
    Id: 'AOS',
    Owner: 'FOOBAR',
    Tags: [
      { name: 'Name', value: 'Thomas' }
    ]
  }
}
const msg = (cmd) => ({
  Target: 'AOS',
  Owner: 'FOOBAR',
  'Block-Height': '1000',
  Id: '1234xyxfoo',
  Module: 'WOOPAWOOPA',
  Tags: [
    { name: 'Action', value: 'Eval' }
  ],
  Data: cmd
})

const { default: AoLoader } = await import(MODULE_PATH)
const wasm = fs.readFileSync('./test/sqlite/process.wasm')

test('create sqlite db, run insert & select', async () => {
  const handle = await AoLoader(wasm, { format: 'wasm32-unknown-emscripten2' })

  const run1 = `
  local sqlite3 = require("lsqlite3")

  db = sqlite3.open_memory()
  
  db:exec[[
    CREATE TABLE test (id INTEGER PRIMARY KEY, content);
    INSERT INTO test VALUES (NULL, 'Hello Lua');
    INSERT INTO test VALUES (NULL, 'Hello Sqlite3');
    INSERT INTO test VALUES (NULL, 'Hello ao!!!');
  ]]
  return "ok"
  `
  const msg1 = msg(run1)
  const result1 = await handle(null, msg1, env)
  console.log('result1:\n' + result1.Output?.data.output)
  assert.equal(result1.Output?.data.output, 'ok')

  const run2 = `
  local s = ""

  for row in db:nrows("SELECT * FROM test") do
    s = s .. row.id .. ": " .. row.content .. "\\n"
  end

  return s
  `
  const msg2 = msg(run2)
  // const result2 = await handle2(result1.Memory, msg2, env)
  const result2 = await handle(result1.Memory, msg2, env)
  console.log('\nresult2:\n' + result2.Output?.data.output)
  assert.equal(result2.Output?.data.output, '1: Hello Lua\n2: Hello Sqlite3\n3: Hello ao!!!\n')
})
