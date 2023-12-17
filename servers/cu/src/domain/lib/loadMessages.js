import { Transform, pipeline } from 'node:stream'

import { Resolved, fromPromise, of } from 'hyper-async'
import { T, always, ascend, cond, equals, ifElse, length, mergeRight, pipe, prop, reduce } from 'ramda'
import { z } from 'zod'
import ms from 'ms'

import { messageSchema, streamSchema } from '../model.js'
import { loadBlocksMetaSchema, loadMessagesSchema, loadTimestampSchema, locateSchedulerSchema } from '../dal.js'

/**
 * - { name: 'Cron-Interval', value: 'interval' }
 * - { name: 'Cron-Tag-Foo', value: 'Bar' }
 * - { name: 'Cron-Tag-Fizz', value: 'Buzz' }
 *
 * Interval Format: 'X-Y'
 *
 * Where X is the value
 * Where Y is the unit:
 * - 'blocks'
 * - time unit ie. 'seconds' 'minutes' 'hours' 'days' 'weeks' 'months' 'years'
 *
 * - '10-blocks'
 * - '10-seconds'
 */
export function parseCrons ({ tags }) {
  function parseInterval (interval = '') {
    const [value, unit] = interval
      .split('-')
      .map(s => s.trim())

    return cond([
      [equals('blocks'), always({ interval, unit, value: parseInt(value) })],
      [equals('block'), always({ interval, unit, value: parseInt(value) })],
      /**
       * Assume it's a time, so convert to seconds
       *
       * TODO: harden
       */
      [T, pipe(
        always({ interval, unit: 'seconds', value: Math.floor(ms([value, unit].join(' ')) / 1000) }),
        (cron) => {
          if (cron.value <= 0) throw new Error('time-based cron cannot be less than 1 second')
          return cron
        }
      )]
    ])(unit)
  }

  return of(tags)
    .chain(tags => {
      /**
       * Build crons from tags.
       * interval is matched with most recent Cron-Interval ta
       *
       * tags like:
       * [
           { name: 'Cron-Interval', value: '5-minutes' },
           { name: 'Cron-Tag-Foo', value: 'Bar' },
           { name: 'Cron-Tag-Fizz', value: 'Buzz' },
           { name: 'Cron-Interval', value: '10-blocks' },
           { name: 'Cron-Tag-Foo', value: 'Bar' },
           { name: 'Cron-Tag-Fizz', value: 'Buzz' },
       * ]
       */
      const crons = reduce(
        (crons, tag) => {
          /**
           * New interval found, so push to list
           */
          if (tag.name === CRON_INTERVAL) {
            crons.push({
              ...parseInterval(tag.value),
              /**
               * Cron Messages may only specify tags
               */
              message: { tags: [] }
            })

            return crons
          }

          if (CRON_TAG_REGEX.test(tag.name)) {
            /**
             * If a Cron-Tag-* is not preceded, at some point, by a Cron-Interval tag, then this is invalid
             * and we throw an error
             */
            if (!crons.length) throw new Error(`Unmatched Cron-Tag with no preceding Cron-Interval: ${tag.name}`)
            const [, tagName] = CRON_TAG_REGEX.exec(tag.name)
            crons[crons.length - 1].message.tags.push({ name: tagName, value: tag.value })
          }

          return crons
        },
        [],
        tags
      )

      return Resolved(crons)
    })
}

export const CRON_INTERVAL = 'Cron-Interval'
export const CRON_TAG_REGEX = /^Cron-Tag-(.+)$/

/**
 * Whether the block height, relative to the origin block height,
 * matches the provided cron
 */
export function isBlockOnCron ({ height, originHeight, cron }) {
  return (height - originHeight) % cron.value === 0
}

/**
 * Whether the timstamp, relative to the origin timestamp,
 * matches the provided cron
 */
export function isTimestampOnCron ({ timestamp, originTimestamp, cron }) {
  /**
   * The smallest unit of time a cron can be placed is in seconds,
   * and if we modulo milliseconds, it can return 0 for fractional overlaps
   * of the scedule
   *
   * So convert the times to seconds perform applying modulo
   */
  timestamp = Math.floor(timestamp / 1000)
  originTimestamp = Math.floor(originTimestamp / 1000)
  return (timestamp - originTimestamp) % cron.value === 0
}

export function cronMessagesBetweenWith ({
  processId,
  owner: processOwner,
  originBlock,
  crons,
  blocksMeta
}) {
  const blockBased = crons.filter(s => s.unit === 'block' || s.unit === 'blocks')
  /**
   * sort time based crons from most granualar to least granular. This will ensure
   * time based messages are ordered consistently w.r.t each other.
   */
  const timeBased = crons.filter(s => s.unit === 'seconds')
    .sort(ascend(prop('value')))

  /**
   * An async iterable whiose results are each a cron message
   * between the left and right boundaries
   */
  return async function * cronMessages (left, right) {
    /**
     * { height, timestamp }
     */
    const leftBlock = left.block
    const rightBlock = right.block

    /**
     * Start at left's block height, incrementing 1 block per iteration until we get to right's block height
     *  - for each block-based cron, check if any illicits a cron message being produced
     *  - for each second between this block and the next,
     *    check if any time-based crons illicit a cron message being produced
     *
     * We must iterate by block, in order to pass the correct block information to the process
     */
    for (let curHeight = leftBlock.height; curHeight < rightBlock.height; curHeight++) {
      const curBlock = blocksMeta.find((b) => b.height === curHeight)
      const nextBlock = blocksMeta.find((b) => b.height === curHeight + 1)
      /**
       * Block-based cron messages
       *
       * Block-based messages will always be pushed onto the stream of messages
       * before time-based messages, which is predictable and deterministic
       */
      for (let i = 0; i < blockBased.length; i++) {
        const cron = blockBased[i]
        if (isBlockOnCron({ height: curBlock.height, originHeight: originBlock.height, cron })) {
          yield {
            cron: `${i}-${cron.interval}`,
            message: {
              Owner: processOwner,
              Target: processId,
              From: processOwner,
              Tags: cron.message.tags,
              Timestamp: curBlock.timestamp,
              'Block-Height': curBlock.height,
              Cron: true
            },
            AoGlobal: {
              process: { id: processId, owner: processOwner }
            }
          }
        }
      }

      /**
       * If there are no time-based crons, then there is no reason to tick
       * through epochs, so simply skip to the next block
       */
      if (!timeBased.length) continue

      /**
       * Time based cron messages.
       *
       * For each second between the current block and the next block, check if any time-based
       * crons need to generate an implicit message
       */
      for (let curTimestamp = curBlock.timestamp; curTimestamp < nextBlock.timestamp; curTimestamp += 1000) {
        for (let i = 0; i < timeBased.length; i++) {
          const cron = timeBased[i]

          if (isTimestampOnCron({ timestamp: curTimestamp, originTimestamp: originBlock.timestamp, cron })) {
            yield {
              cron: `${i}-${cron.interval}`,
              message: {
                Owner: processOwner,
                Target: processId,
                From: processOwner,
                Tags: cron.message.tags,
                Timestamp: curTimestamp,
                'Block-Height': curBlock.height,
                Cron: true
              },
              AoGlobal: {
                process: { id: processId, owner: processOwner },
                block: curBlock
              }
            }
          }
        }
      }

      // TODO implement CRON string based cron messages
    }
  }
}

function loadScheduledMessagesWith ({ locateScheduler, loadMessages, loadBlocksMeta, logger }) {
  locateScheduler = fromPromise(locateSchedulerSchema.implement(locateScheduler))
  loadMessages = fromPromise(loadMessagesSchema.implement(loadMessages))
  loadBlocksMeta = fromPromise(loadBlocksMetaSchema.implement(loadBlocksMeta))

  return (ctx) =>
    of(ctx)
      .map(ctx => {
        logger('Initializing AsyncIterable of Sequenced messages for process "%s" between "%s" and "%s"', ctx.id, ctx.from || 'initial', ctx.to || 'latest')
        return ctx
      })
      .chain((ctx) =>
        locateScheduler(ctx.id)
          .chain(({ url }) => loadMessages({
            suUrl: url,
            processId: ctx.id,
            owner: ctx.owner,
            tags: ctx.tags,
            from: ctx.from, // could be undefined
            to: ctx.to // could be undefined
          }))
      )
}

function loadCronMessagesWith ({ loadTimestamp, locateScheduler, loadBlocksMeta, logger }) {
  locateScheduler = fromPromise(locateSchedulerSchema.implement(locateScheduler))
  loadTimestamp = fromPromise(loadTimestampSchema.implement(loadTimestamp))
  loadBlocksMeta = fromPromise(loadBlocksMetaSchema.implement(loadBlocksMeta))

  /**
   * Given a left-most and right-most boundary, return an async generator,
   * that given a list of values, emits sequential binary tuples dervied from those values,
   * with an additional element appended and prepended to the list of values.
   *
   * This effectively places an tuple aperture on the incoming stream of single values,
   * and with andditional element at the beginning and end of the list
   *
   * Since we added our left and right bounds, there should always
   * be at least one tuple emitted, which will account for any time
   * we have <2 cron messages to use as boundaries.
   *
   * If our leftMost and rightMost boundary are the only boundaries, this effectively means
   * that we have no cron messages to merge and evaluate, and only cron messages to generate
   *
   * [b1, b2, b3] -> [ [b1, b2], [b2, b3] ]
   */
  function genTuplesWithBoundaries ({ left: first, right: last }) {
    return async function * genTuples (boundaries) {
      /**
       * the initial prev is the left-most boundary
       */
      let prev = first
      for await (const boundary of boundaries) {
        yield [prev, boundary]
        prev = boundary
      }

      /**
       * Emit the last boundary
       */
      yield [prev, last]
    }
  }

  return (ctx) => of(ctx)
    .chain(parseCrons)
    .bimap(
      logger.tap('Failed to parse crons:'),
      ifElse(
        length,
        logger.tap('Crons found. Generating cron messages accoding to Crons'),
        logger.tap('No crons found. No cron messages to generate')
      )
    )
    .chain((crons) => {
      /**
       * There are no crons on the process, so no message generation to perform,
       * so simply return the scheduled messages async iterable
       */
      if (!crons.length) return of(ctx.$scheduled)

      /**
       * Merge the scheduled messages stream with cron messages,
       * producing a single merged stream
       */
      return locateScheduler(ctx.id)
        .chain(({ url }) => loadTimestamp({ processId: ctx.id, suUrl: url }))
        .map(logger.tap('loaded current block and tiemstamp from SU'))
        /**
         * In order to generate cron messages and merge them with the
         * scheduled messages, we must first determine our boundaries, which is to say,
         * the left most 'block' and right most 'block' for the span being evaluated.
         *
         * 'block' should be read loosely, as it's really simply a relative
         * height and timestamp ,according to the SU
         */
        .map((currentBlock) => ({
          /**
           * The left most boundary is the origin block of the process -- the current block
           * at the the time the process was sent to a SU
           */
          leftMost: { block: ctx.block },
          /**
           * The right most boundary is always the current block retrieved from the SU
           */
          rightMost: { block: currentBlock }
        }))
        .map(logger.tap('loading blocks meta for scheduled messages in range of %o'))
        .chain(({ leftMost, rightMost }) =>
          loadBlocksMeta({ min: leftMost.block.height, max: rightMost.block.height })
            .map(blocksMeta => {
              return {
                leftMost,
                rightMost,
                $scheduled: ctx.$scheduled,
                /**
                 * Our iterating function that accepts a left and right boundary
                 * and returns an async iterable that emits cron messages
                 * that are between those boundaries
                 */
                genCronMessages: cronMessagesBetweenWith({
                  processId: ctx.id,
                  owner: ctx.owner,
                  originBlock: ctx.block,
                  blocksMeta,
                  crons
                })
              }
            })
        )
        .map(ctx => {
          logger('Merging Streams of Sequenced and Scheduled Messages...')
          return ctx
        })
        .map(({ leftMost, rightMost, $scheduled, genCronMessages }) => {
          /**
           * Each set of cron messages will be generated between a left and right boundary,
           * So we need to procure a set of boundaries to use, while ALSO merging with the scheduled messages
           * from the SU.
           *
           * Our messages retrieved from the SU are perfect boundaries, as they each have a
           * block height and timestamp
           *
           * This will allow the CU to generate cron messages with monotonically increasing timestamp and accurate block metadata,
           * at least w.r.t the SU's claims.
           */
          return pipeline(
            $scheduled,
            Transform.from(genTuplesWithBoundaries({ left: leftMost, right: rightMost })),
            Transform.from(async function * (boundaries) {
              let tuple = await boundaries.next()
              while (!tuple.done) {
                const [left, right] = tuple.value
                logger('Calculating all cron messages between %o and %o', left.block, right.block)
                /**
                 * Emit each cron message as a top-lvl generated value.
                 *
                 * In other words, each tuple can produce an arbitrary number of cron
                 * messages between them, and so emitting them one at a time will respect
                 * backpressure.
                 */
                for await (const message of genCronMessages(left, right)) yield messageSchema.parse(message)
                /**
                 * We need to emit the right boundary since it will always be a message,
                 * EXCEPT for final tuple, since THAT right boundary will be our right-most boundary,
                 * and NOT a message. We will not emit right, if there is no next tuple
                 *
                 * There is no need to unshift the left boundary, as the left will be the next iterations right boundary.
                 * Otherwise, we would end up with duplicates at each boundary
                 */
                const next = await boundaries.next()
                if (!next.done) yield messageSchema.parse(right)
                /**
                 * Set up the next boundary to generate cron messages between
                 */
                tuple = next
              }
            }),
            (err) => {
              if (err) logger('Encountered err when merging scheduled and cron messages', err)
            }
          )
        })
    })
    .map(messages => ({ messages }))
}

/**
 * The result that is produced from this step
 * and added to ctx.
 *
 * This is used to parse the output to ensure the correct shape
 * is always added to context
 */
const ctxSchema = z.object({
  /**
   * Messages to be evaluated, as a stream
   */
  messages: streamSchema
}).passthrough()

/**
 * @typedef LoadMessagesArgs
 * @property {string} id - the contract id
 * @property {string} [from] - the lowermost timestamp
 * @property {string} [to] - the highest timestamp
 *
 * @typedef LoadMessagesResults
 * @property {any[]} messages
 *
 * @callback LoadMessages
 * @param {LoadMessagesArgs} args
 * @returns {Async<LoadMessagesResults & LoadMessagesArgs>}
 *
 * @typedef Env
 * @property {LoadMessages} loadInteractions
 */

/**
 * @param {Env} env
 * @returns {LoadMessages}
 */
export function loadMessagesWith (env) {
  const logger = env.logger.child('loadMessages')
  env = { ...env, logger }

  const loadScheduledMessages = loadScheduledMessagesWith(env)
  const loadCronMessages = loadCronMessagesWith(env)

  return (ctx) =>
    of(ctx)
      .chain(loadScheduledMessages)
      .chain($scheduled => loadCronMessages({ ...ctx, $scheduled }))
      // { messages }
      .map(mergeRight(ctx))
      .map(ctxSchema.parse)
}
