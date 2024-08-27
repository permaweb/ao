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
