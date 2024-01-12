import { of, fromPromise } from 'hyper-async'

export function monitorWith (env) {
  return ({ id, signer }) => of({ data: id, signer })
    .chain(fromPromise(env.postMonitor))
    .toPromise()
}
