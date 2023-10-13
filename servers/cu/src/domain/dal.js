import { z } from 'zod'

import { evaluationSchema, messageSchema, processSchema, rawTagSchema } from './model.js'

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

export const findProcessSchema = z.function()
  .args(z.object({ processId: z.string() }))
  .returns(z.promise(processSchema))

export const saveProcessSchema = z.function()
  .args(processSchema)
  .returns(z.promise(z.any()))

export const findLatestEvaluationSchema = z.function()
  .args(z.object({ id: z.string(), to: z.string().optional() }))
  .returns(z.promise(evaluationSchema.or(z.undefined())))

export const saveEvaluationSchema = z.function()
  .args(evaluationSchema)
  .returns(z.promise(z.any()))

export const loadMessagesSchema = z.function()
  .args(
    z.object({
      id: z.string(),
      owner: z.string(),
      from: z.string().optional(),
      to: z.string().optional()
    })
  )
  .returns(z.promise(z.array(messageSchema)))
