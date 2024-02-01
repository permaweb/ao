import { of } from 'hyper-async'
import { verifyInputWith } from './verify-input.js'
import { runWith } from './run.js'

export function dryrunWith (env) {
  const verifyInput = verifyInputWith(env)
  const dryrun = runWith(env)

  return (msg) => of(msg)
    .chain(verifyInput)
    .chain(dryrun)
    .toPromise()
}
