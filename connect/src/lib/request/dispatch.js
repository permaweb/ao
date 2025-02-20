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
        })
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
          .then((id) =>
            result({
              process: ctx.dataItem.target,
              message: id
            })
          )
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
        // .then(id => result({
        //     process: id,
        //     message: id
        // }))
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
            if (res.status === 200) {
              const process = res.headers.get('process')
              const slot = res.headers.get('slot')
              return request({
                type: 'Message',
                path: `${process}/compute&slot+integer=${slot}/results/json`,
                method: 'POST',
                target: process,
                'slot+integer': slot,
                accept: 'application/json'
              })
                .then(res2 => {
                  if (!res2.process) {
                    res2.process = process
                  }
                  return res2
                })
            }
            return res
          })
      })(ctx)
    }
  }
}
