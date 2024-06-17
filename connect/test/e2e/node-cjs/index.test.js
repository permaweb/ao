const test = require('node:test')
const assert = require('node:assert/strict')

/**
 * Ensure that npm link has been ran prior to running these tests
 * (simply running npm run test:integration will ensure npm link is ran)
 */
const { dryrun } = require('@permaweb/aoconnect')

const PROCESS = 'f6Ie4lnI-g_on29WbRSevAI8f6QTrlTXG1Xb0-TV_Sc'

test('integration - dryrun', async () => {
  const result = await dryrun({
    process: PROCESS,
    data: 'ao.id',
    tags: [
      { name: 'Action', value: 'Eval' },
      { name: 'Data-Protocol', value: 'ao' },
      { name: 'Variant', value: 'ao.TN.1' },
      { name: 'Type', value: 'Message' },
      { name: 'SDK', value: 'aoconnect' }
    ],
    From: 'NlSfGLmEEwRfV2ITvj7QaCcJu59QSPGZ8_rSuioAQKA',
    Owner: 'NlSfGLmEEwRfV2ITvj7QaCcJu59QSPGZ8_rSuioAQKA',
    Anchor: '0'
  })
  console.log(JSON.stringify(result, null, 2))
  assert.ok(true)
})
