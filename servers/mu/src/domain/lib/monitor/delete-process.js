import { fromPromise, of } from 'hyper-async'

export function deleteWith ({ logger, deleteProcess }) {
  const deleteProc = fromPromise(deleteProcess)
  return (ctx) => {
    return of({ id: ctx.tx.processId })
      .chain(deleteProc)
      .map(() => ctx)
  }
}
