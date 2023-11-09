import { pipeline } from 'node:stream'

import { Rejected, Resolved, fromPromise, of } from 'hyper-async'
import { T, always, ascend, cond, equals, ifElse, length, mergeRight, pipe, prop, reduce } from 'ramda'
import { z } from 'zod'
import ms from 'ms'

import { messageSchema } from '../model.js'
import { loadBlocksMetaSchema, loadMessagesSchema, loadTimestampSchema } from '../dal.js'
import { padBlockHeight } from './utils.js'

/**
 * - { name: 'Scheduled-Interval', value: 'interval' }
 * - { name: 'Scheduled-Message', value: 'JSON' }
 *
 * Interval Format: 'X-Y'
 *
 * Where X is the value
 * Where Y is the unit:
 * - 'blocks'
 * - 'cron' (X is cron string)
 * - time unit ie. 'seconds' 'minutes' 'hours' 'days' 'weeks' 'months' 'years'
 *
 * - '10-blocks'
 * - '10-seconds'
 * - '* * * * *-cron'
 */
export function parseSchedules ({ tags }) {
  function parseInterval (interval = '') {
    const [value, unit] = interval
      .split('-')
      .map(s => s.trim())

    return cond([
      [equals('blocks'), always({ interval, unit, value: parseInt(value) })],
      [equals('block'), always({ interval, unit, value: parseInt(value) })],
      [equals('cron'), always({ interval, unit, value })],
      /**
       * Assume it's a time, so convert to seconds
       *
       * TODO: harden
       */
      [T, pipe(
        always({ interval, unit: 'seconds', value: Math.floor(ms([value, unit].join(' ')) / 1000) }),
        (schedule) => {
          if (schedule.value <= 0) throw new Error('time-based interval cannot be less than 1 second')
          return schedule
        }
      )]
    ])(unit)
  }

  return of(tags)
    .chain(tags => {
      /**
       * Build schedules from tags.
       * interval is matched with message using a queue
       *
       * tags like:
       *
       * [
          { name: 'Foo', value: 'Bar' },
          { name: 'Scheduled-Interval', value: '10-blocks' },
          { name: 'Scheduled-Interval', value: ' 20-seconds ' },
          {
            name: 'Scheduled-Message',
            value: action1
          },
          { name: 'Random', value: 'Tag' },
          {
            name: 'Scheduled-Message',
            value: action2
          },
          { name: 'Scheduled-Interval', value: '* 1 * * *-cron' },
          { name: 'Another', value: 'Tag' },
          {
            name: 'Scheduled-Message',
            value: action3
          }
        ]
       */
      const [schedules, queue] = reduce(
        (acc, tag) => {
          /**
           * New interval found, so push to queue
           */
          if (tag.name === SCHEDULED_INTERVAL) acc[1].push(parseInterval(tag.value))
          /**
           * New message found, so combine with earliest found interval
           * and construct the schedule
           */
          if (tag.name === SCHEDULED_MESSAGE) {
            const { value, unit, interval } = acc[1].shift()
            acc[0].push({
              value,
              unit,
              interval,
              message: JSON.parse(tag.value)
            })
          }
          return acc
        },
        [[], []],
        tags
      )

      if (queue.length) return Rejected(`Unmatched Schedules found: ${queue.join(', ')}`)

      if (!schedules.length) return Resolved([])
      return Resolved(schedules)
    })
}

export const SCHEDULED_INTERVAL = 'Scheduled-Interval'
export const SCHEDULED_MESSAGE = 'Scheduled-Message'

/**
 * Whether the block height, relative to the origin block height,
 * matches the provided schedule
 */
export function isBlockOnSchedule ({ height, originHeight, schedule }) {
  return (height - originHeight) % schedule.value === 0
}

/**
 * Whether the timstamp, relative to the origin timestamp,
 * matches the provided schedule
 */
export function isTimestampOnSchedule ({ timestamp, originTimestamp, schedule }) {
  /**
   * The smallest unit of time a schedule can be placed is in seconds,
   * and if we modulo milliseconds, it can return 0 for fractional overlaps
   * of the scedule
   *
   * So convert the times to seconds perform applying modulo
   */
  timestamp = Math.floor(timestamp / 1000)
  originTimestamp = Math.floor(originTimestamp / 1000)
  return (timestamp - originTimestamp) % schedule.value === 0
}

export function scheduleMessagesBetweenWith ({
  processId,
  owner: processOwner,
  originBlock,
  schedules,
  blocksMeta
}) {
  const blockBased = schedules.filter(s => s.unit === 'block' || s.unit === 'blocks')
  /**
   * sort time based schedules from most granualar to least granular. This will ensure
   * time based messages are ordered consistently w.r.t each other.
   */
  const timeBased = schedules.filter(s => s.unit === 'seconds')
    .sort(ascend(prop('value')))

  /**
   * An async iterable whiose results are each a scheduled message
   * between the left and right boundaries
   */
  return async function * scheduledMessages (left, right) {
    /**
     * We extract the hash at the end of the left boundary,
     * so that any scheduled messages generated between left and right
     * can simply use that hash as part of their generated sortKey.
     *
     * {blockHeight},{timestampMillis},{txIdHash}[,{idx}{intervalName}]
     *
     * This should always retrieve the hash portion of the sortKey,
     * regardless if there is an {idx}{intervalName} portion of not
     */
    const leftHash = left.sortKey.split(',')
      .slice(2)
      // {txIdHash}[,{idx}{intervalName}]
      .shift()

    /**
     * { height, timestamp }
     */
    const leftBlock = left.block
    const rightBlock = right.block

    /**
     * This is the first time in a long time that
     * i've written a vanilla for-loop lol
     *
     * Start at left's block height, incrementing 1 block per iteration until we get to right's block height
     *  - for each block-based schedule, check if any illicits a scheduled message being produced
     *  - for each second between this block and the next,
     *    check if any time-based schedules illicit a scheduled message being produced
     *
     * We must iterate by block, in order to pass the correct block information to the process
     */
    for (let curHeight = leftBlock.height; curHeight < rightBlock.height; curHeight++) {
      const curBlock = blocksMeta.find((b) => b.height === curHeight)
      const nextBlock = blocksMeta.find((b) => b.height === curHeight + 1)
      /**
       * Block-based schedule messages
       *
       * Block-based messages will always be pushed onto the sequence of messages
       * before time-based messages, which is predictable and deterministic
       */
      for (let i = 0; i < blockBased.length; i++) {
        const schedule = blockBased[i]
        if (isBlockOnSchedule({ height: curBlock.height, originHeight: originBlock.height, schedule })) {
          yield {
            message: {
              ...schedule.message,
              owner: processOwner,
              target: processId
            },
            /**
             * TODO: don't know if this is correct, but we need something unique for the sortKey
             * for the scheduled message
             *
             * append ${schedule.interval}${idx} to sortKey to make unique within block/timestamp.
             * It will also enable performing range queries to fetch all scheduled messages by simply
             * appending a ',' to any sortKey
             */
            sortKey: padBlockHeight(`${curBlock.height},${curBlock.timestamp},${leftHash},idx${i}-${schedule.interval}`),
            AoGlobal: {
              process: { id: processId, owner: processOwner },
              block: curBlock
            }
          }
        }
      }

      /**
       * If there are no time-based schedules, then there is no reason to tick
       * through epochs, so simply skip to the next block
       */
      if (!timeBased.length) continue

      /**
       * Time based scheduled messages.
       *
       * For each second between the current block and the next block, check if any time-based
       * schedules need to generate an implicit message
       */
      for (let curTimestamp = curBlock.timestamp; curTimestamp < nextBlock.timestamp; curTimestamp += 1000) {
        for (let i = 0; i < timeBased.length; i++) {
          const schedule = timeBased[i]

          if (isTimestampOnSchedule({ timestamp: curTimestamp, originTimestamp: originBlock.timestamp, schedule })) {
            yield {
              message: {
                ...schedule.message,
                target: processId,
                owner: processOwner
              },
              /**
               * TODO: don't know if this is correct, but we need something unique for the sortKey
               * for the scheduled message
               *
               * append ${schedule.interval}${idx} to sortKey to make unique within block/timestamp.
               * It will also enable performing range queries to fetch all scheduled messages by simply
               * appending a ',' to any sortKey
               */
              sortKey: padBlockHeight(`${curHeight},${curTimestamp},${leftHash},idx${i}-${schedule.interval}`),
              AoGlobal: {
                process: { id: processId, owner: processOwner },
                block: curBlock
              }
            }
          }
        }
      }

      // TODO implement CRON based schedules
    }
  }
}

function loadSequencedMessagesWith ({ loadMessages, loadBlocksMeta, logger }) {
  loadMessages = fromPromise(loadMessagesSchema.implement(loadMessages))
  loadBlocksMeta = fromPromise(loadBlocksMetaSchema.implement(loadBlocksMeta))

  return (ctx) =>
    of(ctx)
      .map(ctx => {
        logger('Initializing AsyncIterable of Sequenced messages for process "%s" between "%s" and "%s"', ctx.id, ctx.from || 'initial', ctx.to || 'latest')
        return ctx
      })
      /**
       * Returns an async iterable whose results are each a sequenced message
       */
      .chain(args => loadMessages({
        processId: args.id,
        owner: args.owner,
        from: args.from, // could be undefined
        to: args.to // could be undefined
      }))
}

function loadScheduledMessagesWith ({ loadTimestamp, loadBlocksMeta, logger }) {
  loadTimestamp = fromPromise(loadTimestampSchema.implement(loadTimestamp))
  loadBlocksMeta = fromPromise(loadBlocksMetaSchema.implement(loadBlocksMeta))

  function parseSortKeyOrBlock ({ id, sortKey, block }) {
    if (sortKey) {
      /**
       * {blockHeight},{timestampMillis},{txIdHash}[,{idx}{intervalName}]
       */
      const [paddedBlockHeight, timestampMillis] = String(sortKey).split(',')
      return {
        block: {
          height: parseInt(paddedBlockHeight),
          timestamp: parseInt(timestampMillis)
        },
        sortKey
      }
    }

    return {
      block,
      /**
       * We are masquerading a sortKey in this case, as only the hash portion
       * is needed as part of any monotonically increasing sort keys
       * generated for scheduled messages
       *
       * (see 'leftHash' in scheduleMessagesBetweenWith())
       */
      sortKey: `,,${id}`
    }
  }

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
   * we have <2 sequenced messages to use as boundaries.
   *
   * If our leftMost and rightMost boundary are the only boundaries, this effectively means
   * that we have no sequenced messages to merge and evaluate, and only scheduled messages to generate
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
    .chain(parseSchedules)
    .bimap(
      logger.tap('Failed to parse schedules:'),
      ifElse(
        length,
        logger.tap('Schedules found. Generating schedule messages accoding to schedules'),
        logger.tap('No schedules found. No scheduled messages to generate')
      )
    )
    .chain((schedules) => {
      /**
       * There are no schedules on the process, so no message generation to perform,
       * so simply return the sequenced messages async iterable
       */
      if (!schedules.length) return of(ctx.$sequenced)

      /**
       * Merge the sequence messages stream with scheduled messages,
       * producing a single merged stream
       */
      return loadTimestamp()
        .map(logger.tap('loaded current block and tiemstamp from SU'))
        /**
         * In order to generate scheduled messages and merge them with the
         * sequenced messages, we must first determine our boundaries, which is to say,
         * the left most 'block' and right most 'block' for the span being evaluated.
         *
         * 'block' should be read loosely, as it's really simply a relative height and timestamp derived from the SU,
         * either parsed from a sortKey, or derived from the SU's claimed current block and timestamp
         */
        .map((currentBlock) => ({
          /**
           * The left most boundary is determined either using the 'from' sortKey,
           * or, in the case of 'from' not being defined, the origin block of the process.
           *
           * But we also have to take into account the sequenced messages (see findLeftMostBlock above)
           */
          leftMost: parseSortKeyOrBlock({ id: ctx.id, sortKey: ctx.from, block: ctx.block }),
          /**
           * The right most boundary is determine either using the 'to' sortKey or,
           * in the case of 'to' not being defined, the current block according to the SU
           */
          rightMost: parseSortKeyOrBlock({ id: ctx.id, sortKey: ctx.to, block: currentBlock })
        }))
        .map(logger.tap('loading blocks meta for sequenced messages in range of %o'))
        .chain(({ leftMost, rightMost }) =>
          loadBlocksMeta({ min: leftMost.block.height, max: rightMost.block.height })
            .map(blocksMeta => {
              return {
                leftMost,
                rightMost,
                $sequenced: ctx.$sequenced,
                /**
                 * Our iterating function that accepts a left and right boundary
                 * and returns an async iterable that emits scheduled messages
                 * that are between those boundaries
                 */
                genScheduledMessages: scheduleMessagesBetweenWith({
                  processId: ctx.id,
                  owner: ctx.owner,
                  originBlock: ctx.block,
                  blocksMeta,
                  schedules
                })
              }
            })
        )
        .map(ctx => {
          logger('Merging Streams of Sequenced and Scheduled Messages...')
          return ctx
        })
        .map(({ leftMost, rightMost, $sequenced, genScheduledMessages }) => {
          /**
           * Each set of scheduled messages will be generated between a left and right boundary,
           * So we need to procure a set of boundaries to use, while ALSO merging with the sequenced messages
           * from the SU.
           *
           * Our messages retrieved from the SU are perfect boundaries, as they each have a
           * sortKey to parse a hash from (for the purpose of generating monotonically increasing sortKeys for generated scheduled messages)
           * and a block that contains a height and timestamp.
           *
           * This will allow the CU to generate scheduled messages with monotonically increasing sortKeys and accurate block metadata,
           * at least w.r.t the SU's claims.
           */
          return pipeline(
            $sequenced,
            genTuplesWithBoundaries({ left: leftMost, right: rightMost }),
            async function * (boundaries) {
              let tuple = await boundaries.next()
              while (!tuple.done) {
                const [left, right] = tuple.value
                logger('Calculating all scheduled messages between %o and %o', left.block, right.block)
                /**
                 * Emit each scheduled message as a top-lvl generated value.
                 *
                 * In other words, each tuple can produce an arbitrary number of scheduled
                 * messages between them, and so emitting them one at a time will respect
                 * backpressure.
                 */
                for await (const message of genScheduledMessages(left, right)) yield messageSchema.parse(message)
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
                 * Set up the next boundary to generate scheduled messages between
                 */
                tuple = next
              }
            },
            (err) => {
              if (err) logger('Encountered err when merging sequenced and scheduled messages', err)
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
   * Messages to be evaluated, as an async generator
   */
  messages: z.any()
}).passthrough()

/**
 * @typedef LoadMessagesArgs
 * @property {string} id - the contract id
 * @property {string} [from] - the lowermost sortKey
 * @property {string} [to] - the highest sortKey
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

  const loadSequencedMessages = loadSequencedMessagesWith(env)
  const loadScheduledMessages = loadScheduledMessagesWith(env)

  return (ctx) =>
    of(ctx)
      .chain(loadSequencedMessages)
      .chain($sequenced => loadScheduledMessages({ ...ctx, $sequenced }))
      // { messages }
      .map(mergeRight(ctx))
      .map(ctxSchema.parse)
}
