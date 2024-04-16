import { z } from 'zod'

const tagSchema = z.object({
  name: z.string(),
  value: z.string()
})

// CU

export const dryrunResultSchema = z.function()
  .args(z.object({
    Id: z.string(),
    Target: z.string(),
    Owner: z.string(),
    Anchor: z.string().optional(),
    Data: z.any().default('1234'),
    Tags: z.array(z.object({ name: z.string(), value: z.string() }))
  }))
  .returns(z.promise(z.any()))

export const loadResultSchema = z.function()
  .args(z.object({
    id: z.string().min(1, { message: 'message id is required' }),
    processId: z.string().min(1, { message: 'process id is required' })
  }))
  .returns(z.promise(z.any()))

export const queryResultsSchema = z.function()
  .args(z.object({
    process: z.string().min(1, { message: 'process id is required' }),
    from: z.string().optional(),
    to: z.string().optional(),
    sort: z.enum(['ASC', 'DESC']).default('ASC'),
    limit: z.string().optional()
  }))
  .returns(z.promise(z.object({
    edges: z.array(z.object({
      cursor: z.string(),
      node: z.object({
        Output: z.any().optional(),
        Messages: z.array(z.any()).optional(),
        Spawns: z.array(z.any()).optional(),
        Error: z.any().optional()
      })
    }))
  })))

// MU

export const deployMessageSchema = z.function()
  .args(z.object({
    processId: z.string(),
    data: z.any(),
    tags: z.array(tagSchema),
    anchor: z.string().optional(),
    signer: z.any()
  }))
  .returns(z.promise(
    z.object({
      messageId: z.string()
    }).passthrough()
  ))

export const deployProcessSchema = z.function()
  .args(z.object({
    data: z.any(),
    tags: z.array(tagSchema),
    signer: z.any()
  }))
  .returns(z.promise(
    z.object({
      processId: z.string()
    }).passthrough()
  ))

export const deployAssignSchema = z.function()
  .args(z.object({
    process: z.string(),
    message: z.string(),
    baseLayer: z.boolean().optional(),
    exclude: z.array(z.string()).optional()
  }))
  .returns(z.promise(
    z.object({
      assignmentId: z.string()
    }).passthrough()
  ))

/**
 * Same contract shape
 */
export const deployMonitorSchema = deployMessageSchema

// SU

export const loadProcessMetaSchema = z.function()
  .args(z.object({
    suUrl: z.string().url(),
    processId: z.string()
  }))
  .returns(z.promise(
    z.object({
      tags: z.array(tagSchema)
    }).passthrough()
  ))

export const locateSchedulerSchema = z.function()
  .args(z.string())
  .returns(z.promise(
    z.object({
      url: z.string()
    })
  ))

export const validateSchedulerSchema = z.function()
  .args(z.string())
  .returns(z.promise(z.boolean()))

// Gateway
export const loadTransactionMetaSchema = z.function()
  .args(z.string())
  .returns(z.promise(
    z.object({
      tags: z.array(tagSchema)
    }).passthrough()
  ))

export const signerSchema = z.function()
  .args(z.object({
    data: z.any(),
    tags: z.array(tagSchema),
    /**
     * target must be set with writeMessage,
     * but not for createProcess
     */
    target: z.string().optional(),
    anchor: z.string().optional()
  }))
  .returns(z.promise(
    z.object({
      id: z.string(),
      raw: z.any()
    })
  ))

/**
 * A hack to get reuse JSDoc types in other files
 * See https://stackoverflow.com/questions/49836644/how-to-import-a-typedef-from-one-file-to-another-in-jsdoc-using-node-js
 *
 * We can simply define types here as needed
 *
 * @typedef Types
 * @property {z.infer<typeof signerSchema>} signer
 */
export const Types = {}
