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
          { name: 'Type', value: 'Process' },
          { name: 'Module', value: 'module-id-123' },
          { name: 'Content-Type', value: 'text/plain' },
          { name: 'SDK', value: 'ao' }
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
      moduleId: 'module-id-123',
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
          { name: 'Type', value: 'Process' },
          { name: 'Module', value: 'module-id-123' },
          { name: 'Content-Type', value: 'text/plain' },
          { name: 'SDK', value: 'ao' }
        ])

        return { res: 'foobar', processId: 'process-id-123' }
      },
      registerProcess: async () => ({ foo: 'bar' }),
      logger
    })

    await uploadProcess({
      moduleId: 'module-id-123',
      signer: async () => ({ id: 'process-id-123', raw: 'raw-buffer' })
    }).toPromise()
  })

  test('deduplicates identifying tags', async () => {
    const uploadProcess = uploadProcessWith({
      deployProcess: async ({ tags }) => {
        assert.deepStrictEqual(tags, [
          { name: 'Data-Protocol', value: 'ao' },
          { name: 'Type', value: 'Process' },
          { name: 'Module', value: 'module-id-123' },
          { name: 'Content-Type', value: 'text/plain' },
          { name: 'SDK', value: 'ao' }
        ])

        return { res: 'foobar', processId: 'process-id-123' }
      },
      registerProcess: async () => ({ foo: 'bar' }),
      logger
    })

    await uploadProcess({
      moduleId: 'module-id-123',
      tags: [
        { name: 'Type', value: 'Process' },
        { name: 'Type', value: 'Process' },
        { name: 'Module', value: 'oops-duplicate' }
      ],
      signer: async () => ({ id: 'process-id-123', raw: 'raw-buffer' })
    }).toPromise()
  })
})
