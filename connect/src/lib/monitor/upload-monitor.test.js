import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../../logger.js'
import { uploadMonitorWith } from './upload-monitor.js'

const logger = createLogger('monitor')

describe('upload-monitor', () => {
  test('add the tags, sign, and upload the monitor, and return the monitorId', async () => {
    const uploadMonitor = uploadMonitorWith({
      deployMonitor: async ({ processId, data, tags, signer }) => {
        assert.ok(data)
        assert.equal(processId, 'process-asdf')
        assert.deepStrictEqual(tags, [])
        assert.ok(signer)

        return { messageId: 'monitor-id-123' }
      },
      logger
    })

    await uploadMonitor({
      id: 'process-asdf',
      signer: () => {}
    }).toPromise()
      .then(res => assert.equal(res.monitorId, 'monitor-id-123'))
  })
})
