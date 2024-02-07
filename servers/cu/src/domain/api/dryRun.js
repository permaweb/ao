import { Readable } from 'node:stream'
import { omit } from 'ramda'
import { Resolved, of } from 'hyper-async'

import { loadMessageMetaWith } from '../lib/loadMessageMeta.js'
import { evaluateWith } from '../lib/evaluate.js'
import { messageSchema } from '../model.js'
import { loadModuleWith } from '../lib/loadModule.js'
import { mapFrom } from '../utils.js'
import { readStateWith } from './readState.js'

/**
 * @typedef Env
 *
 * @typedef Result
 *
 * @typedef ReadResultArgs
 * @property {string} messageTxId
 *
 * @callback ReadResult
 * @param {ReadResultArgs} args
 * @returns {Promise<Result>} result
 *
 * @param {Env} - the environment
 * @returns {ReadResult}
 */
export function dryRunWith (env) {
  const loadMessageMeta = loadMessageMetaWith(env)
  const loadModule = loadModuleWith(env)
  const readState = readStateWith(env)
  const evaluate = evaluateWith(env)

  return ({ processId, messageTxId, dryRun }) => {
    return of({ messageTxId })
      .chain(({ messageTxId }) => {
        /**
         * Load the metadata associated with the messageId ie.
         * it's timestamp and ordinate, so readState can evaluate
         * up to that point (if it hasn't already)
         */
        if (messageTxId) return loadMessageMeta({ processId, messageTxId })

        /**
         * No messageTxId provided so evaluate up to latest
         */
        return Resolved({
          processId,
          to: undefined,
          ordinate: undefined
        })
      })
      /**
       * Read up to the specified 'to', or latest
       */
      .chain((res) =>
        readState({
          processId: res.processId,
          to: res.timestamp,
          /**
           * The ordinate for a scheduled message is it's nonce
           */
          ordinate: `${res.nonce}`,
          /**
           * We know this is a scheduled message, and so has no
           * associated cron.
           *
           * So we explicitly set cron to undefined, for posterity
           */
          cron: undefined,
          /**
           * If we are evaluating up to a specific message, as indicated by
           * the presence of messageTxId, then we make sure we get an exact match.
           *
           * Otherwise, we are evaluating up to the latest
           */
          exact: !!messageTxId,
          needsMemory: true
        })
      )
      /**
       * We've read up to 'to', now inject the dry-run message
       *
       * { id, owner, tags, output: { Memory, Error, Messages, Spawns, Output } }
       */
      .chain((readStateRes) => {
        return of(readStateRes)
          .chain((ctx) => {
            /**
             * If a cached evaluation was found and immediately returned,
             * then we will have not loaded the module and attached it to ctx.
             *
             * So we check if ctx.module is set, and load the Module if not.
             *
             * This check will prevent us from unnecessarily loading the module
             * from Arweave, twice.
             */
            if (!ctx.module) return loadModule(ctx)

            /**
             * The module was loaded by readState, as part of evaluation,
             * so no need to load it again. Just reuse it
             */
            return Resolved(ctx)
          })
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
                ordinate: readStateRes.ordinate,
                name: 'Dry Run Message',
                message: {
                  /**
                   * We default timestamp and block-height using
                   * the current evaluation.
                   *
                   * The Dry-Run message can overwrite them
                   */
                  Timestamp: readStateRes.from,
                  'Block-Height': readStateRes.fromBlockHeight,
                  Cron: false,
                  Target: processId,
                  ...dryRun,
                  From: mapFrom({ tags: dryRun.Tags, owner: dryRun.Owner }),
                  'Read-Only': true
                },
                AoGlobal: {
                  Process: { Id: processId, Owner: readStateRes.owner, Tags: readStateRes.tags }
                }
              })
            }

            /**
             * Pass a messages stream to evaluate that only emits the single dry-run
             * message and then completes
             */
            return evaluate({ ...ctx, messages: Readable.from(dryRunMessage()) })
          })
      })
      .map((res) => res.output)
      .map(omit(['Memory']))
  }
}
