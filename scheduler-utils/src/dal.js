import { z } from 'zod'

const processCacheEntry = z.object({ url: z.string(), address: z.string() })
const scheduler = z.object({ url: z.string(), address: z.string(), ttl: z.coerce.number() })

export const checkForRedirectSchema = z.function()
  .args(z.string(), z.string())
  .returns(z.promise(z.string()))

export const getByProcessSchema = z.function()
  .args(z.string())
  .returns(z.promise(processCacheEntry.nullish()))

export const setByProcessSchema = z.function()
  .args(z.string(), processCacheEntry, z.number())
  .returns(z.promise(z.any()))

export const getByOwnerSchema = z.function()
  .args(z.string())
  .returns(z.promise(scheduler.nullish()))

export const setByOwnerSchema = z.function()
  .args(z.string(), z.string(), z.number())
  .returns(z.promise(z.any()))

export const loadSchedulerSchema = z.function()
  .args(z.string())
  .returns(z.promise(scheduler))

export const loadProcessSchedulerSchema = loadSchedulerSchema
