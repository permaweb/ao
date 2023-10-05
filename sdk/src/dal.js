import { z } from 'zod'

const tagSchema = z.object({
  name: z.string(),
  value: z.string()
})

export const loadStateSchema = z.function()
  .args(z.object({
    id: z.string().min(1, { message: 'contract id is required' }),
    sortKey: z.string().optional()
  }))
  .returns(
    z.promise(z.any())
  )

export const deployInteractionSchema = z.function()
  .args(z.object({
    contractId: z.string(),
    data: z.any(),
    tags: z.array(tagSchema),
    signer: z.any()
  }))
  .returns(z.promise(
    z.object({
      interactionId: z.string()
    }).passthrough()
  ))

export const deployContractSchema = z.function()
  .args(z.object({
    data: z.any(),
    tags: z.array(tagSchema),
    signer: z.any()
  }))
  .returns(z.promise(
    z.object({
      contractId: z.string()
    }).passthrough()
  ))

export const registerContractSchema = z.function()
  .args(z.object({
    contractId: z.string()
  }))
  .returns(z.promise(
    z.object({
      contractId: z.string()
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

/**
 * Zod strips away properties on functions when passed to implement,
 * so we make sure to place _ back on the parsed fn
 */
export const signerSchema = {
  implement: (fn) => {
    const parsed = z.function()
      .args(z.object({
        data: z.any(),
        tags: z.array(tagSchema)
      }))
      .returns(z.promise(
        z.object({
          id: z.string(),
          raw: z.any()
        })
      )).implement(fn)

    parsed._ = fn._

    return parsed
  }
}
