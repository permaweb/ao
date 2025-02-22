import { fromPromise } from 'hyper-async'

export function dispatch ({ request, spawn, message, result, dryrun, signer }) {
  return function (ctx) {
    if (ctx.type === 'dryrun' && ctx.dataItem) {
      const inputData = {
        process: ctx.dataItem.target,
        anchor: ctx.dataItem.anchor,
        tags: ctx.dataItem.tags,
        data: ctx.datatItem?.data ?? ''
      }
      return fromPromise(() =>
        dryrun(inputData).catch((err) => {
          if (err.message.includes('Insufficient funds')) {
            return { error: 'insufficient-funds' }
          }
          throw err
        }).then(res => ({ res }))
      )(ctx)
    }

    if (ctx.type === 'Message' && ctx.dataItem) {
      return fromPromise((ctx) =>
        message({
          process: ctx.dataItem.target,
          anchor: ctx.dataItem.anchor,
          tags: ctx.dataItem.tags,
          data: ctx.dataItem.data ?? '',
          signer
        })
          // no magic just return response
          // .then((id) =>
          //   result({
          //     process: ctx.dataItem.target,
          //     message: id
          //   }).then(res => ({ res }))
          // )
          .catch((err) => {
            if (err.message.includes('Insufficient funds')) {
              return { error: 'insufficient-funds' }
            }
            throw err
          })
      )(ctx)
    }
    if (ctx.type === 'Process' && ctx.dataItem) {
      return fromPromise((ctx) =>
        spawn({
          tags: ctx.dataItem.tags,
          data: ctx.dataItem.data,
          scheduler: ctx.dataItem.tags.find((t) => t.name === 'Scheduler')
            ?.value,
          module: ctx.dataItem.tags.find((t) => t.name === 'Module')?.value,
          signer
        })
          .then(res => ({ res }))
          .catch((err) => {
            if (err.message.includes('Insufficient funds')) {
              return { error: 'insufficient-funds' }
            }
            throw err
          })
      )(ctx)
    }
    if (ctx.map) {
      return fromPromise((ctx) => {
        return request(ctx.map)
          .then(res => {
            // const process = res.headers.get('process')
            // const slot = res.headers.get('slot')
            return ({res})
          })
          // don't get the compute result
          // .then(res => {
          //   if (res.status === 200) {
          //     const process = res.headers.get('process')
          //     const slot = res.headers.get('slot')

          //     return request({
          //       type: 'Message',
          //       path: `${process}/compute&slot+integer=${slot}/results/json`,
          //       method: 'POST',
          //       target: process,
          //       'slot+integer': slot,
          //       accept: 'application/json'
          //     })
          //       .then(res2 => {
          //         // if (!res2.process) {
          //         //   console.log(process, slot)
          //         //   res2.headers.set('process', process)
          //         // }
          //         return ({ res: res2, process, slot })
          //       })
          //   }
          //   return ({ res })
          // })
      })(ctx)
    }
  }
}
