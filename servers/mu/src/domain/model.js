import { z } from 'zod'

export const rawTagSchema = z.object({
  name: z.string(),
  value: z.string()
})

export const tagArraySchema = z.array(rawTagSchema)

export const bufferSchema = z.any().refine(buffer => {
  return buffer instanceof ArrayBuffer ||
    ArrayBuffer.isView(buffer) ||
    Buffer.isBuffer(buffer)
}, { message: 'Value must implement the buffer protocol' })

export const processOwnerSchema = z.object({
  address: z.string(),
  key: z.string()
})

export const messageSchema = z.object({
  Tags: tagArraySchema,
  Target: z.string(),
  Anchor: z.string(),
  Data: z.any().nullish()
})
export const messageArraySchema = z.array(messageSchema)

export const spawnSchema = z.object({
  Tags: tagArraySchema,
  Anchor: z.string(),
  Data: z.any().nullish()
})
export const spawnArraySchema = z.array(spawnSchema)

export const assignmentSchema = z.object({
  Processes: z.array(z.string()),
  Message: z.string()
})
export const assignmentArraySchema = z.array(assignmentSchema)
