import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { z } from 'zod'

import { errFrom } from './utils.js'

describe('utils', () => {
  describe('errFrom', () => {
    test('should map ZodError to a friendly error', async () => {
      const schema = z.function().args(z.object({ name: z.string() })).returns(
        z.promise(z.object({ ok: z.boolean() }))
      )

      const fn = schema.validate(function wrongReturn () {
        return Promise.resolve({ not: 'ok' })
      })

      const err = await fn({ name: 'string' }).catch(errFrom)

      assert.equal(err.message, 'Invalid Return \'ok\': Required.')

      const errWrongArgs = await fn({ name: 123 }).catch(errFrom)

      assert.equal(
        errWrongArgs.message,
        'Invalid Arguments \'name\': Expected string, received number.'
      )
    })
  })
})
