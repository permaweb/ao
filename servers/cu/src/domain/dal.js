import { z } from 'zod'

import { evaluationSchema, messageSchema, processSchema, rawBlockSchema, rawTagSchema } from './model.js'

// Gateway

export const loadTransactionMetaSchema = z.function()
  .args(z.string())
  .returns(z.promise(
    z.object({
      owner: z.object({
        address: z.string()
      }),
      tags: z.array(rawTagSchema)
    }).passthrough()
  ))

export const loadTransactionDataSchema = z.function()
  .args(z.string())
  .returns(z.promise(z.any()))

export const loadBlocksMetaSchema = z.function()
  .args(z.object({ left: z.number(), right: z.number() }))
  .returns(z.promise(
    z.array(
      rawBlockSchema.passthrough()
    )
  ))

// DB

export const findProcessSchema = z.function()
  .args(z.object({ processId: z.string() }))
  .returns(z.promise(processSchema))

export const saveProcessSchema = z.function()
  .args(processSchema)
  .returns(z.promise(z.any()))

export const findLatestEvaluationSchema = z.function()
  .args(z.object({ processId: z.string(), to: z.string().optional() }))
  .returns(z.promise(evaluationSchema))

export const saveEvaluationSchema = z.function()
  .args(evaluationSchema)
  .returns(z.promise(z.any()))

// SU

export const loadMessagesSchema = z.function()
  .args(
    z.object({
      processId: z.string(),
      owner: z.string(),
      from: z.string().optional(),
      to: z.string().optional()
    })
  )
  .returns(z.promise(z.array(messageSchema)))

export const loadTimestampSchema = z.function()
  .returns(z.promise(z.date()))
