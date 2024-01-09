import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * Ensure that npm link has been ran prior to running these tests
 * (simply running npm run test:integration will ensure npm link is ran)
 */
import { readState } from '@permaweb/ao-sdk'

const CONTRACT = 'VkjFCALjk4xxuCilddKS8ShZ-9HdeqeuYQOgMgWucro'
/**
 * js contract, with lots of interactions. Good for debugging interactions bit
 */
// const CONTRACT = 'SFKREVkacx7N64SIfAuNkMOPTocm42qbkKwzRJGfQHY'

test('integration - readState', async () => {
  const result = await readState({ processId: CONTRACT })
  console.log(JSON.stringify(result, null, 2))
  assert.ok(true)
})
