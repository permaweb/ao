import { of } from 'hyper-async'
import { z } from 'zod'

const inputSchema = z.object({
  Id: z.string(),
  Target: z.string(),
  Owner: z.string(),
  Anchor: z.string().optional(),
  Data: z.any().default('1234'),
  Tags: z.array(z.object({ name: z.string(), value: z.string() }))
})

/**
 * @typedef Message
 * @property {string} Id
 * @property {string} Target
 * @property {string} Owner
 * @property {string} [Anchor]
 * @property {any} Data
 * @property {Record<name,value>[]} Tags
 *
 * @callback VerifyInput
 * @param {Message} msg
 * @returns {Message}
 *
 * @returns {VerifyInput}
 */
export function verifyInputWith () {
  return (msg) => {
    return of(msg)
      .map(inputSchema.parse)
      .map(m => {
        m.Tags = m.Tags.concat([
          { name: 'Data-Protocol', value: 'ao' },
          { name: 'Type', value: 'Message' },
          { name: 'Variant', value: 'ao.TN.1' }
        ])
        return m
      })
  }
}
