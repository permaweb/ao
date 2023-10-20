import { z } from 'zod'

const tagSchema = z.object({
  name: z.string(),
  value: z.string()
})

export const loadStateSchema = z.function()
  .args(z.object({
    id: z.string().min(1, { message: 'process id is required' }),
    sortKey: z.string().optional()
  }))
  .returns(
    z.promise(z.any())
  )

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

export const registerProcessSchema = z.function()
  .args(z.object({
    processId: z.string()
  }))
  .returns(z.promise(
    z.object({
      processId: z.string()
    }).passthrough()
  ))

export const loadTransactionMetaSchema = z.function()
  .args(z.string())
  .returns(z.promise(
    z.object({
      tags: z.array(tagSchema)
    }).passthrough()
  ))

export const loadTransactionDataSchema = z.function()
  .args(z.string())
  .returns(z.promise(z.any()))

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
