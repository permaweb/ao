import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../../logger.js'
import { uploadProcessWith } from './upload-process.js'

const logger = createLogger('createProcess')

describe('upload-process', () => {
  test('add the tags, sign, upload the process, register the process, and return the processId', async () => {
    const uploadProcess = uploadProcessWith({
      deployProcess: async ({ data, tags, signer }) => {
        assert.ok(data)
        assert.deepStrictEqual(tags, [
          { name: 'foo', value: 'bar' },
          { name: 'Data-Protocol', value: 'ao' },
          { name: 'Variant', value: 'ao.TN.1' },
          { name: 'Type', value: 'Process' },
          { name: 'Module', value: 'module-id-123' },
          { name: 'Scheduler', value: 'zVkjFCALjk4xxuCilddKS8ShZ-9HdeqeuYQOgMgWucro' },
          { name: 'SDK', value: 'aoconnect' },
          { name: 'Content-Type', value: 'text/plain' }
        ])
        assert.ok(signer)

        return {
          res: 'foobar',
          processId: 'process-id-123',
          signedDataItem: { id: 'process-id-123', raw: 'raw-buffer' }
        }
      },
      registerProcess: async (signedDataItem) => {
        assert.deepStrictEqual(signedDataItem, { id: 'process-id-123', raw: 'raw-buffer' })
        return { foo: 'bar' }
      },
      logger
    })

    await uploadProcess({
      module: 'module-id-123',
      scheduler: 'zVkjFCALjk4xxuCilddKS8ShZ-9HdeqeuYQOgMgWucro',
      tags: [
        { name: 'foo', value: 'bar' }
      ],
      signer: async () => ({ id: 'process-id-123', raw: 'raw-buffer' })
    }).toPromise()
      .then(res => assert.equal(res.processId, 'process-id-123'))
  })

  test('defaults tags if none are provided', async () => {
    const uploadProcess = uploadProcessWith({
      deployProcess: async ({ tags }) => {
        assert.deepStrictEqual(tags, [
          { name: 'Data-Protocol', value: 'ao' },
          { name: 'Variant', value: 'ao.TN.1' },
          { name: 'Type', value: 'Process' },
          { name: 'Module', value: 'module-id-123' },
          { name: 'Scheduler', value: 'zVkjFCALjk4xxuCilddKS8ShZ-9HdeqeuYQOgMgWucro' },
          { name: 'SDK', value: 'aoconnect' },
          { name: 'Content-Type', value: 'text/plain' }
        ])

        return { res: 'foobar', processId: 'process-id-123' }
      },
      registerProcess: async () => ({ foo: 'bar' }),
      logger
    })

    await uploadProcess({
      module: 'module-id-123',
      scheduler: 'zVkjFCALjk4xxuCilddKS8ShZ-9HdeqeuYQOgMgWucro',
      signer: async () => ({ id: 'process-id-123', raw: 'raw-buffer' })
    }).toPromise()
  })

  test('does not overwrite data', async () => {
    const uploadProcess = uploadProcessWith({
      deployProcess: async ({ data, tags, signer }) => {
        assert.equal(data, 'foobar')
        /**
         * Assert no Content-Type tag is added
         */
        assert.deepStrictEqual(tags, [
          { name: 'foo', value: 'bar' },
          { name: 'Data-Protocol', value: 'ao' },
          { name: 'Variant', value: 'ao.TN.1' },
          { name: 'Type', value: 'Process' },
          { name: 'Module', value: 'module-id-123' },
          { name: 'Scheduler', value: 'zVkjFCALjk4xxuCilddKS8ShZ-9HdeqeuYQOgMgWucro' },
          { name: 'SDK', value: 'aoconnect' }
        ])
        return {
          res: 'foobar',
          processId: 'process-id-123',
          signedDataItem: { id: 'process-id-123', raw: 'raw-buffer' }
        }
      },
      registerProcess: async () => {
        return { foo: 'bar' }
      },
      logger
    })

    await uploadProcess({
      module: 'module-id-123',
      scheduler: 'zVkjFCALjk4xxuCilddKS8ShZ-9HdeqeuYQOgMgWucro',
      tags: [
        { name: 'foo', value: 'bar' }
      ],
      data: 'foobar',
      signer: async () => ({ id: 'process-id-123', raw: 'raw-buffer' })
    }).toPromise()
  })
})
