import { z } from 'zod'

export const loadStateSchema = z.function()
  .args(z.object({
    id: z.string().min(1, { message: 'contract id is required' }),
    sortKey: z.string().optional()
  }))
  .returns(
    z.promise(z.record(z.any()))
  )

// TODO: define this shape
export const writeInteractionSchema = z.function()
  .args(z.record(z.any()))
  .returns(z.promise(z.any()))

export const signInteractionSchema = z.function()
  .args(z.record(z.any()))
  .returns(z.promise(z.any()))

export const loadTransactionMetaSchema = z.function()
  .args(z.string())
  .returns(z.promise(z.any()))

export const loadTransactionDataSchema = z.function()
  .args(z.string())
  .returns(z.promise(z.any()))
