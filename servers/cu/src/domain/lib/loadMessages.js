import { Rejected, Resolved, fromPromise, of } from 'hyper-async'
import { T, __, always, aperture, ascend, assoc, cond, equals, head, last, mergeRight, prop, reduce } from 'ramda'
import { z } from 'zod'
import ms from 'ms'

import { messageSchema } from '../model.js'
import { loadMessagesSchema, loadTimestampSchema } from '../dal.js'

/**
 * - { name: 'scheduled-interval', value: 'interval' }
 * - { name: 'scheduled-message', value: 'JSON' }
 *
 * Interval Format: 'X_Y'
 *
 * Where X is the value
 * Where Y is the unit:
 * - 'blocks'
 * - 'cron' (X is cron string)
 * - time unit ie. 'seconds' 'minutes' 'hours' 'days' 'weeks' 'months' 'years'
 *
 * - '10_blocks'
 * - '10_seconds'
 * - '* * * * *_cron'
 */
export function parseSchedules ({ tags }) {
  function parseInterval (interval = '') {
    const [value, unit] = interval
      .split('_')
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
      [T, always({ interval, unit: 'seconds', value: Math.floor(ms([value, unit].join(' ')) / 1000) })]
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
          { name: 'scheduled-interval', value: '10_blocks' },
          { name: 'scheduled-interval', value: ' 20_seconds ' },
          {
            name: 'scheduled-message',
            value: action1
          },
          { name: 'Random', value: 'Tag' },
          {
            name: 'scheduled-message',
            value: action2
          },
          { name: 'scheduled-interval', value: '* 1 * * *_cron' },
          { name: 'Another', value: 'Tag' },
          {
            name: 'scheduled-message',
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
            acc[0].push({ value, unit, interval, message: JSON.parse(tag.value) })
          }
          return acc
        },
        [[], []],
        tags
      )

      if (queue.length) return Rejected(`Unmatched Schedules found: ${queue.join(', ')}`)

      if (!schedules.length) return Rejected('No schedules found')
      return Resolved(schedules)
    })
}

export const SCHEDULED_INTERVAL = 'scheduled-interval'
export const SCHEDULED_MESSAGE = 'scheduled-message'

function loadSequencedMessagesWith ({ loadMessages, loadBlocksMeta }) {
  loadMessages = fromPromise(loadMessagesSchema.implement(loadMessages))

  return (ctx) => of(ctx)
    .chain(args => loadMessages({
      processId: args.id,
      owner: args.owner,
      from: args.from,
      to: args.to
    }))
    .chain((sequenced) => {
      const min = head(sequenced)
      const max = last(sequenced)

      /**
       * We have to load the metadata for all the blocks between
       * the earliest and latest message being evaluated, so that we
       * can generate the scheduled messages that occur on each block
       */
      return loadBlocksMeta({ min: min.block.height, max: max.block.height })
        .map(blockRange => ({ ...ctx, sequenced, blockRange }))
    })
}

export function scheduleMessagesWith ({ processId, owner, originBlock, suTime, schedules, blockRange }) {
  /**
   * This will be added to the CU clock to take into account
   * any difference between the SU (whose generated sortKeys depend on its clock)
   * and the CU determining where implicit messages need to be evaluated
   *
   * The number of seconds difference between the SU clock and the CU clock
   *
   * TODO: don't think we need this since CU never instantiates a date, and
   * were only adding seconds to the timestamp as part of the block
   */
  // eslint-disable-next-line
  const suSecondsCorrection = Math.floor(
    (suTime.getTime() - new Date().getTime()) / 1000
  )

  const blockBased = schedules.filter(s => s.unit === 'block' || s.unit === 'blocks')
  /**
   * sort time based schedules from most granualar to least granular. This will ensure
   * time based messages are ordered consistently w.r.t each other.
   */
  const timeBased = ascend(
    prop('value'),
    schedules.filter(s => s.unit === 'time')
  )

  function maybeMessages (left, right) {
    const iMessages = []

    // No Schedules
    if (!blockBased.length || timeBased.length) return iMessages

    /**
     * This is the first time in a long time that
     * i've written a vanilla for-loop lol
     *
     * Start at left's block height, incrementing 1 block per iteration until we get to right's block height
     *  - for each block-based schedule, check and see if any illicits a scheduled message being produced
     *  - for each second between this block and the next,
     *    check and if any time-based schedules illicit a scheduled message being produced
     *
     * We must iterate by block, in order to pass the correct block information to the process, as part of
     * the scheduled message payload
     */
    for (let curHeight = left.height; curHeight < right.height; curHeight++) {
      const curBlock = blockRange.find((b) => b.height === curHeight)
      const nextBlock = blockRange.find((b) => b.height === curHeight + 1)

      /**
       * Block-based schedule messages
       *
       * Block-based messages will always be pushed onto the sequence of messages
       * before time-based messages, which is predictable and deterministic
       */
      iMessages.push.apply(
        iMessages,
        blockBased.reduce(
          (acc, schedule) => {
            if (curHeight - originBlock.height % schedule.value === 0) {
              /**
               * TODO: build out message shape
               */
              acc.push({
                isScheduled: true,
                /**
                 * TODO: don't know if this is correct, but we need something unique for the sortKey
                 * for the scheduled message
                 */
                sortKey: `${curBlock.height},${curBlock.timestamp},${processId},${schedule.interval}`,
                anchor: `${curBlock.height},${curBlock.timestamp},${processId},${schedule.interval}`,
                owner,
                block: curBlock,
                tags: schedule.message,
                AoGlobal: {
                  process: { id: processId, owner },
                  block: curBlock
                }
              })
            }
            return acc
          },
          []
        )
      )

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
      for (let curEpoch = curBlock.timestamp; curEpoch < nextBlock.timestamp; curEpoch++) {
        iMessages.push.apply(
          iMessages,
          timeBased.reduce(
            (acc, schedule) => {
              if ((curEpoch - originBlock.timestamp) % schedule.value === 0) {
                acc.push({
                  isScheduled: true,
                  /**
                   * TODO: don't know if this is correct, but we need something unique for the sortKey
                   * for the scheduled message
                   */
                  sortKey: `${curBlock.height},${curBlock.timestamp},${processId},${schedule.interval}`,
                  anchor: `${curBlock.height},${curBlock.timestamp},${processId},${schedule.interval}`,
                  owner,
                  block: curBlock,
                  tags: schedule.message,
                  AoGlobal: {
                    process: { id: processId, owner },
                    block: curBlock
                  }
                })
              }
              return acc
            },
            []
          )
        )
      }

      // TODO implement CRON based schedules
    }

    return iMessages
  }

  return ([left, right]) => {
    const messages = []
    messages.push.apply(messages, maybeMessages(left.block, right.block))
    /**
     * Sandwich the scheduled messages between the two actual messages
     */
    messages.unshift(left)
    messages.push(right)
    return messages
  }
}

function loadScheduledMessagesWith ({ loadTimestamp, logger }) {
  loadTimestamp = fromPromise(loadTimestampSchema.implement(loadTimestamp))

  /**
   * - find all schedule tags on the process
   * - if schedules exist:
   *   - for each pair of messages
   *     - determine date range and block range
   *     - generate X number of scheduled messages
   *     - place in between messages
   * - else noop
   */
  return (ctx) => of(ctx)
    .chain(parseSchedules)
    .bichain(
      logger.tap('Could not parse schedules:'),
      /**
       * Some schedules were found, so potentially generate messages from them
       */
      (schedules) =>
        loadTimestamp()
          .chain((suTime) =>
            of(ctx.sequenced)
              /**
               * Split our list of sequenced messages into binary Tuples
               * of consecutive messages
               */
              .map(aperture(2))
              .map(pairs => {
                const scheduleMessages = scheduleMessagesWith({
                  processId: ctx.id,
                  owner: ctx.owner,
                  originBlock: ctx.originBlock,
                  blockRange: ctx.blockRange,
                  schedules,
                  suTime
                })

                return reduce(
                  (merged, pair) => {
                    merged.push.apply(merged, scheduleMessages(pair))
                    return merged
                  },
                  [],
                  pairs
                )
              })
          )
    )
    .map(assoc('messages', __, ctx))
}

/**
 * The result that is produced from this step
 * and added to ctx.
 *
 * This is used to parse the output to ensure the correct shape
 * is always added to context
 */
const ctxSchema = z.object({
  messages: z.array(messageSchema)
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
      .chain(loadScheduledMessages)
      .map(mergeRight(ctx))
      .map(ctxSchema.parse)
      .map(logger.tap('Loaded messages and appended to context %j'))
}
