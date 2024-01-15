import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../../logger.js'
import { uploadUnmonitorWith } from './upload-unmonitor.js'

const logger = createLogger('monitor')

describe('upload-unmonitor', () => {
  test('add the tags, sign, and upload the unmonitor, and return the monitorId', async () => {
    const uploadUnmonitor = uploadUnmonitorWith({
      deployUnmonitor: async ({ processId, data, tags, signer }) => {
        assert.ok(data)
        assert.equal(processId, 'process-asdf')
        assert.deepStrictEqual(tags, [])
        assert.ok(signer)

        return { messageId: 'monitor-id-123' }
      },
      logger
    })

    await uploadUnmonitor({
      id: 'process-asdf',
      signer: () => {}
    }).toPromise()
      .then(res => assert.equal(res.monitorId, 'monitor-id-123'))
  })
})
