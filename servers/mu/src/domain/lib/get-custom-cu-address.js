import fs from 'fs'
import { of, Rejected, Resolved } from 'hyper-async'
import z from 'zod'
import { __, assoc, identity } from 'ramda'

const ctxSchema = z.object({
  customCuUrl: z.string(),
  cuAddress: z.string()
}).passthrough()

function getAddressFromMapWith ({ CUSTOM_CU_MAP_FILE_PATH }) {
  return (ctx) => {
    return of(ctx.processId)
      .chain((processId) => {
        const map = fs.readFileSync(CUSTOM_CU_MAP_FILE_PATH, 'utf8')
        const mapObj = JSON.parse(map)
        return of(mapObj[processId])
          .chain((customCuUrl) => {
            if (!customCuUrl) {
              return Rejected(new Error('No custom CU address found', { cause: ctx }))
            }
            return Resolved(`http://${customCuUrl}:6363`)
          })
      })
  }
}
export function getCustomCuAddressWith ({ CUSTOM_CU_MAP_FILE_PATH, logger }) {
  return (ctx) => {
    const getAddressFromMap = getAddressFromMapWith({ CUSTOM_CU_MAP_FILE_PATH })
    return of({ processId: ctx.tx.processId, logId: ctx.logId })
      .chain(getAddressFromMap)
      .map((customCuUrl) => {
        return { ...ctx, customCuUrl, cuAddress: customCuUrl }
      })
      .map(ctxSchema.parse)
      .bimap(
        (e) => {
          return new Error(e, { cause: ctx })
        },
        identity
      )
      .map(logger.tap({ log: 'Added cuAddress to ctx' }))
  }
}
