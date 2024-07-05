import { z } from 'zod'

import { blockSchema, evaluationSchema, processSchema, moduleSchema, rawTagSchema, streamSchema, processCheckpointSchema, bufferSchema } from './model.js'

// Arweave

export const loadTransactionMetaSchema = z.function()
  // Zod function doesn't allow optional arguments
  // https://github.com/colinhacks/zod/issues/2990
  // .args(z.string(), z.any())
  .returns(z.promise(
    z.object({
      owner: z.object({
        address: z.string(),
        key: z.string()
      }),
      tags: z.array(rawTagSchema).default([])
    }).passthrough()
  ))

export const loadTransactionDataSchema = z.function()
  .args(z.string())
  .returns(z.promise(z.any()))

export const loadBlocksMetaSchema = z.function()
  .args(z.object({
    min: z.number(),
    /**
     * Since we don't have access to the max block we're evaluating,
     * only the timestamp, we will provide that timestamp.
     *
     * Then the impl will load blocks between min and max, but nost past the
     * maxTimestamp, whichever comes first
     */
    maxTimestamp: z.coerce.number()
  }))
  .returns(z.promise(
    z.array(blockSchema.passthrough())
  ))

// Process

export const findProcessSchema = z.function()
  .args(z.object({ processId: z.string() }))
  .returns(z.promise(processSchema))

export const saveProcessSchema = z.function()
  .args(processSchema)
  .returns(z.promise(z.any()))

export const isProcessOwnerSupportedSchema = z.function()
  .args(z.string())
  .returns(z.promise(z.boolean()))

// Process Memory
export const findLatestProcessMemorySchema = z.function()
  .args(z.object({
    processId: z.string(),
    timestamp: z.coerce.number().nullish(),
    ordinate: z.coerce.string().nullish(),
    cron: z.string().nullish(),
    omitMemory: z.boolean().nullish()
  })).returns(z.promise(processCheckpointSchema))

export const saveLatestProcessMemorySchema = z.function()
  .args(z.object({
    processId: z.string(),
    moduleId: z.string().nullish(),
    messageId: z.string().nullish(),
    timestamp: z.coerce.number().nullish(),
    epoch: z.coerce.number().nullish(),
    nonce: z.coerce.number().nullish(),
    ordinate: z.coerce.string().nullish(),
    cron: z.string().nullish(),
    blockHeight: z.coerce.number().nullish(),
    Memory: bufferSchema,
    evalCount: z.number().nullish(),
    gasUsed: z.bigint().nullish()
  }))
  .returns(z.promise(z.any()))

// Module

export const findModuleSchema = z.function()
  .args(z.object({ moduleId: z.string() }))
  .returns(z.promise(moduleSchema))

export const saveModuleSchema = z.function()
  .args(moduleSchema)
  .returns(z.promise(z.any()))

export const evaluatorSchema = z.function()
// TODO: beef up input and output shapes
  .args(z.any())
  .returns(z.promise(z.any()))

// Evaluation

export const findEvaluationSchema = z.function()
  .args(z.object({
    processId: z.string(),
    to: z.coerce.number().nullish(),
    ordinate: z.coerce.string().nullish(),
    cron: z.string().nullish()
  }))
  .returns(z.promise(evaluationSchema))

export const saveEvaluationSchema = z.function()
  .args(evaluationSchema.extend({ deepHash: z.string().nullish(), isAssignment: z.boolean() }))
  .returns(z.promise(z.any()))

export const findEvaluationsSchema = z.function()
  .args(z.object({
    processId: z.string(),
    from: z.object({
      timestamp: z.coerce.number().nullish(),
      ordinate: z.coerce.string().nullish(),
      cron: z.string().nullish()
    }).default({}),
    to: z.object({
      timestamp: z.coerce.number().nullish(),
      ordinate: z.coerce.string().nullish(),
      cron: z.string().nullish()
    }).default({}),
    sort: z.enum(['ASC', 'DESC']).default('ASC'),
    limit: z.number(),
    onlyCron: z.boolean().default(false)
  }))
  .returns(z.promise(z.array(evaluationSchema)))

// Messages

export const findMessageBeforeSchema = z.function()
  .args(z.object({
    messageId: z.string().nullish(),
    deepHash: z.string().nullish(),
    isAssignment: z.boolean(),
    processId: z.string(),
    epoch: z.coerce.number(),
    nonce: z.coerce.number()
  }))
  /**
   * Our business logic doesn't use the output,
   * only the presence or absence of the record,
   *
   * So we don't need to enforce a shape to return here
   */
  .returns(z.promise(z.any()))

// Blocks

export const saveBlocksSchema = z.function()
  .args(z.array(blockSchema))
  .returns(z.promise(z.any()))

export const findBlocksSchema = z.function()
  .args(z.object({
    minHeight: z.number(),
    maxTimestamp: z.number()
  }))
  .returns(z.promise(z.array(blockSchema)))

// SU

export const loadMessagesSchema = z.function()
  .args(
    z.object({
      suUrl: z.string().url(),
      processId: z.string(),
      owner: z.string(),
      tags: z.array(rawTagSchema),
      moduleId: z.string(),
      moduleTags: z.array(rawTagSchema),
      moduleOwner: z.string(),
      from: z.coerce.number().nullish(),
      to: z.coerce.number().nullish()
    })
  )
  /**
   * Returns a Stream that wraps an AsyncIterable, which is not something that Zod can
   * parse natively, so we make sure the returned value implements a pipe api
   */
  .returns(z.promise(streamSchema))

export const loadProcessSchema = z.function()
  .args(z.object({
    suUrl: z.string().url(),
    processId: z.string().min(1)
  }))
  .returns(z.promise(processSchema.omit({ id: true })))

export const loadTimestampSchema = z.function()
  .args(z.object({
    suUrl: z.string().url(),
    processId: z.string().min(1)
  }))
  .returns(z.promise(z.object({
    height: z.number(),
    timestamp: z.number()
  })))

export const loadMessageMetaSchema = z.function()
  .args(z.object({
    suUrl: z.string().url(),
    processId: z.string().min(1),
    messageTxId: z.string().min(1)
  }))
  .returns(z.promise(
    z.object({
      processId: z.string().min(1),
      timestamp: z.number(),
      nonce: z.number()
    })
  ))

export const locateProcessSchema = z.function()
  .args(z.object({
    processId: z.string(),
    schedulerHint: z.string().nullish()
  }))
  .returns(z.promise(
    z.object({
      url: z.string()
    })
  ))
