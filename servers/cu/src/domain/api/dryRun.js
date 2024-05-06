import { Readable } from 'node:stream'
import { omit } from 'ramda'
import { of } from 'hyper-async'

import { loadProcessWith } from '../lib/loadProcess.js'
import { loadModuleWith } from '../lib/loadModule.js'
import { evaluateWith } from '../lib/evaluate.js'
import { messageSchema } from '../model.js'
import { mapFrom } from '../utils.js'

/**
 * @typedef Env
 *
 * @typedef Result
 *
 * @typedef DryRunArgs
 * @property {string} processId
 * @property {any} dryRun
 *
 * @callback DryRun
 * @param {DryRunArgs} args
 * @returns {Promise<Result>} result
 *
 * @param {Env} - the environment
 * @returns {DryRun}
 */
export function dryRunWith (env) {
  const loadProcess = loadProcessWith(env)
  const loadModule = loadModuleWith(env)
  const evaluate = evaluateWith(env)

  return ({ processId, dryRun }) => {
    const stats = {
      startTime: new Date(),
      endTime: undefined,
      messages: {
        scheduled: 0,
        cron: 0
      }
    }

    const logStats = (res) => {
      stats.endTime = new Date()
      env.logger(
        'dryRun for process "%s" at nonce "%s" took %d milliseconds: %j',
        processId,
        res.ordinate,
        stats.endTime - stats.startTime,
        stats
      )

      return res
    }

    return of({ id: processId, stats })
      .chain(loadProcess)
      .chain(loadModule)
      .chain((ctx) => {
        async function * dryRunMessage () {
          /**
           * Dry run messages are not signed, and therefore
           * will not have a verifiable Id, Signature, Owner, etc.
           *
           * NOTE:
           * Dry Run messages are not signed, therefore not verifiable.
           *
           * This is generally okay, because dry-run message evaluations
           * are Read-Only and not persisted -- the primary use-case for Dry Run is to enable
           * retrieving a view of a processes state, without having to send a bonafide message.
           *
           * However, we should keep in mind the implications. One implication is that spoofing
           * Owner or other fields on a Dry-Run message (unverifiable context) exposes a way to
           * "poke and prod" a process modules for vulnerabilities.
           */
          yield messageSchema.parse({
            /**
             * Don't save the dryRun message
             */
            noSave: true,
            deepHash: undefined,
            cron: undefined,
            ordinate: ctx.ordinate,
            name: 'Dry Run Message',
            message: {
              /**
               * We default timestamp and block-height using
               * the current evaluation.
               *
               * The Dry-Run message can overwrite them
               */
              Timestamp: ctx.from,
              'Block-Height': ctx.fromBlockHeight,
              Cron: false,
              Target: processId,
              ...dryRun,
              From: mapFrom({ tags: dryRun.Tags, owner: dryRun.Owner }),
              'Read-Only': true
            },
            AoGlobal: {
              Process: { Id: processId, Owner: ctx.owner, Tags: ctx.tags },
              Module: { Id: ctx.moduleId, Owner: ctx.moduleOwner, Tags: ctx.moduleTags }
            }
          })
        }

        /**
         * Pass a messages stream to evaluate that only emits the single dry-run
         * message and then completes
         */
        return evaluate({ ...ctx, messages: Readable.from(dryRunMessage()) })
      })
      .bimap(logStats, logStats)
      .map((res) => res.output)
      .map(omit(['Memory']))
  }
}
