import { PassThrough, Transform, pipeline } from 'node:stream'

import { Resolved, fromPromise, of } from 'hyper-async'
import { T, always, ascend, cond, equals, ifElse, last, length, mergeRight, pipe, prop, reduce } from 'ramda'
import { z } from 'zod'
import ms from 'ms'

import { messageSchema, streamSchema } from '../model.js'
import { loadBlocksMetaSchema, loadMessagesSchema, loadTimestampSchema, locateSchedulerSchema } from '../dal.js'
import { trimSlash } from '../utils.js'

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
  /**
   * Don't count the origin height as a match
   */
  if (height === originHeight) return false

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
  /**
   * don't count the origin timestamp as a match
   */
  if (timestamp === originTimestamp) return false
  return (timestamp - originTimestamp) % cron.value === 0
}

export function cronMessagesBetweenWith ({
  logger,
  processId,
  owner: processOwner,
  tags: processTags,
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
    const leftOrdinate = left.ordinate

    /**
     * Grab the blocks that are between the left and right boundary,
     * according to their timestamp
     */
    const blocksInRange = blocksMeta.filter((b) =>
      b.timestamp > leftBlock.timestamp &&
      b.timestamp < rightBlock.timestamp
    )

    /**
     * Start at the left block timestamp, incrementing one second per iteration.
     * - if our current time gets up to the next block, then check for any block-based cron messages to generate
     * - Check for any timebased crons to generate on each tick
     *
     * The curBlock always starts at the leftBlock, then increments as we tick
     */
    let curBlock = leftBlock
    for (let curTimestamp = leftBlock.timestamp; curTimestamp < rightBlock.timestamp; curTimestamp += 1000) {
      /**
       * We've ticked up to our next block
       * so check if it's on a Cron Interval
       *
       * This way, Block-based messages will always be pushed onto the stream of messages
       * before time-based messages
       */
      const nextBlock = blocksInRange[0]
      if (nextBlock && Math.floor(curTimestamp / 1000) >= Math.floor(nextBlock.timestamp / 1000)) {
        /**
         * Make sure to remove the block from our range,
         * since we've ticked past it,
         *
         * and save it as the new current block
         */
        curBlock = blocksInRange.shift()

        for (let i = 0; i < blockBased.length; i++) {
          const cron = blockBased[i]

          if (isBlockOnCron({ height: curBlock.height, originHeight: originBlock.height, cron })) {
            logger('Generating Block based Cron Message for cron "%s" at block "%s"', `${i}-${cron.interval}`, curBlock.height)
            yield {
              cron: `${i}-${cron.interval}`,
              ordinate: leftOrdinate,
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
                Process: { Id: processId, Owner: processOwner, Tags: processTags }
              }
            }
          }
        }
      }

      for (let i = 0; i < timeBased.length; i++) {
        const cron = timeBased[i]

        if (isTimestampOnCron({ timestamp: curTimestamp, originTimestamp: originBlock.timestamp, cron })) {
          logger('Generating Time based Cron Message for cron "%s" at timestamp "%s"', `${i}-${cron.interval}`, curTimestamp)
          yield {
            cron: `${i}-${cron.interval}`,
            ordinate: leftOrdinate,
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
              Process: { Id: processId, Owner: processOwner, Tags: processTags }
            }
          }
        }
      }
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
        logger('Initializing AsyncIterable of Scheduled messages for process "%s" between "%s" and "%s"', ctx.id, ctx.from || 'initial', ctx.to || 'latest')
        return ctx
      })
      .chain((ctx) =>
        locateScheduler(ctx.id)
          .chain(({ url }) => loadMessages({
            suUrl: trimSlash(url),
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

  return (ctx) => of(ctx)
    .chain(parseCrons)
    .bimap(
      logger.tap('Failed to parse crons:'),
      ifElse(
        length,
        logger.tap('Crons found. Generating cron messages according to Crons'),
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
        .chain(({ url }) => loadTimestamp({ processId: ctx.id, suUrl: trimSlash(url) }))
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
           * The left most boundary is:
           * a. when cold starting: is the origin block of the process -- the current block at the the time the process was sent to a SU
           * b. when hot-starting: the block height and timestamp of the most recently evaluated message
           *
           * We also initilize the ordinate here, which will be used to "generate" an orderable
           * ordinate for generated Cron messages. This value is usually the nonce of the most recent
           * schedule message. So in sense, Cron message exists "between" scheduled message nonces
           */
          leftMost: { ordinate: ctx.ordinate, block: ctx.from ? { height: ctx.fromBlockHeight, timestamp: ctx.from } : ctx.block },
          /**
           * The right most boundary is derived from:
           * 1. when evaluating up to a specific scheduled message: the provided 'to' which is the messages timestamp
           * 2. when evaluating up to the present: the current block timestamp according to the su
           *
           * This timestamp is then used to load the block metadata from the gateway,
           * so generated Cron Messages can have accurate block height metadata
           */
          rightMostTimestamp: ctx.to || currentBlock.timestamp
        }))
        .map(logger.tap('loading blocks meta for scheduled messages in range of %o'))
        .chain(({ leftMost, rightMostTimestamp }) =>
          loadBlocksMeta({
            min: leftMost.block.height,
            maxTimestamp: rightMostTimestamp
          })
            .map(blocksMeta => {
              return {
                leftMost,
                blocksMeta,
                $scheduled: ctx.$scheduled,
                /**
                 * Our iterating function that accepts a left and right boundary
                 * and returns an async iterable that emits cron messages
                 * that are between those boundaries
                 */
                genCronMessages: cronMessagesBetweenWith({
                  logger,
                  processId: ctx.id,
                  owner: ctx.owner,
                  tags: ctx.tags,
                  originBlock: ctx.block,
                  blocksMeta,
                  crons
                })
              }
            })
        )
        .map(ctx => {
          logger('Merging Streams of Scheduled and Cron Messages...')
          return ctx
        })
        .map(({ leftMost, blocksMeta, $scheduled, genCronMessages }) => {
          return pipeline(
            /**
             * Given a left-most and right-most boundary, return an async generator,
             * that given a list of values, emits sequential binary tuples dervied from those values.
             *
             * This effectively places an tuple aperture on the incoming stream of single values
             *
             * There should always be at least one tuple emitted. We will always have a leftMost boundary,
             * but the right boundary will depend on which value is greater:
             * a. the right most (newest) scheduled message OR
             * b. the right most (newest) block from blocksMeta
             *
             * [b1, b2, b3] -> [ [b1, b2], [b2, b3] ]
             */
            async function * genBoundariesAsTuples () {
              /**
               * the initial prev is the left-most boundary
               */
              let prev = leftMost

              /**
               * Each set of cron messages will be generated between a left and right boundary,
               * So we need to procure a set of boundaries to use, while ALSO merging with the scheduled messages
               * from the SU, producing a single ordered sequence of messages to be evaluated by the process.
               *
               * Our messages retrieved from the SU are perfect boundaries, as they each have a
               * block height and timestamp, as well as a ordinate set to its nonce.
               *
               * This will allow the CU to generate cron messages that are orderable in and
               * amongst the scheduled message, and with accurate block metadata, at least w.r.t the SU's claims.
               */
              const scheduled = $scheduled[Symbol.asyncIterator]()

              let message = await scheduled.next()
              while (true) {
                const { value, done } = message
                /**
                 * We're done, so break the loop
                 */
                if (done) break

                const next = await scheduled.next()
                /**
                 * Only set the flag to emit left, if it is NOT the leftMost boundary,
                 * since the leftMost boundary is not a message. Every left boundary after that _will_ be,
                 * and so should be emitted.
                 *
                 * The right boundary should not be emitted, since it will become the next iterations left,
                 * UNLESS this is the final iteration, in which case there won't _be_ a next iteration,
                 * and therefore 'right' should be emitted now.
                 *
                 * If we didn't make this no-emit/emit distinction on the right boundary,
                 * we would end up with duplicate emits at each boundary
                 */
                yield [prev !== leftMost, prev, next.done, value]
                prev = value
                message = next
              }

              /**
               * The right most block, as determined by the rightMostTimestamp,
               * is later than the latest 'prev' block, according to their timestamps. This means we have to emit
               * one more tuple to in order to generate any potential Cron Messages between the last
               * 'prev' and the actual right-most boundary.
               *
               * In this case, neither boundary should be emitted down the stream, because 'prev' will
               * have already been emitted by the loop above, and 'right' is not a message.
               *
               * NOTE:
               * This should only ever happen if a scheduled message is not the right-most boundary,
               * which would subsequently only happen in the case of an arbitrary timestamp being provided as 'to'
               * (like someone calling readState with a 'to' or no 'to' at all).
               *
               * If a scheduled message result is being read (the vast majority of use-cases),
               * this last tuple won't be fired
               */
              const rightMostBlock = last(blocksMeta)
              if (prev.block.timestamp < rightMostBlock.timestamp) {
                logger(
                  'rightMostBlock at timestamp "%s" is later than latest message at timestamp "%s". Emitting extra set of boundaries on end...',
                  rightMostBlock.timestamp,
                  prev.block.timestamp
                )
                yield [false, prev, false, { block: rightMostBlock }]
              }
            },
            Transform.from(async function * (boundaries) {
              for await (const [doEmitLeft, left, doEmitRight, right] of boundaries) {
                logger('Calculating all cron messages between %o and %o', left.block, right.block)

                if (doEmitLeft) yield left

                /**
                 * Emit each cron message as a top-lvl generated value.
                 *
                 * In other words, each tuple can produce an arbitrary number of cron
                 * messages between them, and so emitting them one at a time will respect
                 * backpressure.
                 */
                for await (const message of genCronMessages(left, right)) yield message

                if (doEmitRight) yield right
              }
            }),
            (err) => {
              if (err) logger('Encountered err when merging scheduled and cron messages', err)
            }
          )
        })
    })
    /**
     * If this is a process cold start, the first 'message' evaluated by the module
     * will be the process, itself, meaning the process tags, data, etc.
     *
     * So we check to see if this is a cold start, by checking if the 'from' is undefined.
     * If so, we know the evaluation is starting from the beginning (cold start), and we will
     * construct and emit a 'message' for the process
     */
    .map($messages => {
      return pipeline(
        async function * () {
          const isColdStart = !ctx.from

          /**
           * Generate and emit a message that represents the process itself.
           *
           * It will be the first message evaluated by the module
           */
          if (isColdStart) {
            const processMessage = messageSchema.parse({
              /**
               * Ensure the noSave flag is set, so evaluation does not persist
               * this process message
               */
              noSave: true,
              ordinate: '^',
              message: {
                Id: ctx.id,
                Signature: ctx.signature,
                Data: ctx.data,
                Owner: ctx.owner,
                /**
                 * the target of the process message is itself
                 */
                Target: ctx.id,
                Anchor: ctx.anchor,
                /**
                 * the process message is from the owner of the process
                 */
                From: ctx.owner,
                Tags: ctx.tags,
                Epoch: undefined,
                Nonce: undefined,
                Timestamp: ctx.block.timestamp,
                'Block-Height': ctx.block.height,
                Cron: false
              },
              AoGlobal: {
                Process: { Id: ctx.id, Owner: ctx.owner, Tags: ctx.tags }
              }
            })
            logger('Emitting process message at beginning of evaluation stream for process %s cold start: %o', ctx.id, processMessage)
            yield processMessage
          }

          /**
           * Emit the merged stream of Cron and Scheduled Messages
           */
          for await (const message of $messages) yield messageSchema.parse(message)
        },
        new PassThrough({ objectMode: true }),
        (err) => {
          if (err) logger('Encountered err when emitting messages to eval', err)
        }
      )
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
