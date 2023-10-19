import { Rejected, Resolved, fromPromise, of } from 'hyper-async'
import { T, always, aperture, ascend, cond, equals, head, last, mergeRight, prop, reduce } from 'ramda'
import { z } from 'zod'
import ms from 'ms'

import { messageSchema } from '../model.js'
import { findLatestEvaluationSchema, loadMessagesSchema, loadTimestampSchema } from '../dal.js'
import { parseTags } from './utils.js'

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

export function scheduleMessagesBetweenWith ({
  processId,
  owner: processOwner,
  originBlock,
  suTime,
  schedules,
  blockRange
}) {
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
    (suTime - new Date().getTime()) / 1000
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

  /**
   * { sortKey, block, message }
   */
  function maybeScheduledMessages (left, right) {
    const scheduledMessages = []

    /**
     * {blockHeight},{timestampMillis},{txIdHash}
     */
    const leftHash = left.sortKey.split(',').pop()
    /**
     * { height, timestamp }
     */
    const leftBlock = left.block
    const rightBlock = right.block

    // No Schedules
    if (!blockBased.length || timeBased.length) return scheduledMessages

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
      const curBlock = blockRange.find((b) => b.height === curHeight)
      const nextBlock = blockRange.find((b) => b.height === curHeight + 1)
      /**
       * The timestamp for blocks meta from the gateway is currently in seconds
       * while the SU uses a millisecond timestamp, so we convert the seconds
       * into milliseconds for each block
       *
       * TODO: probably should be done as part of the gateway?
       */
      const curBlockMills = curBlock.timestamp * 1000
      const nextBlockMillis = nextBlock.timestamp * 1000

      /**
       * Block-based schedule messages
       *
       * Block-based messages will always be pushed onto the sequence of messages
       * before time-based messages, which is predictable and deterministic
       */
      scheduledMessages.push.apply(
        scheduledMessages,
        blockBased.reduce(
          (acc, schedule, idx) => {
            if (curHeight - originBlock.height % schedule.value === 0) {
              acc.push({
                message: {
                  owner: processOwner,
                  target: processId,
                  tags: schedule.message
                },
                /**
                 * TODO: don't know if this is correct, but we need something unique for the sortKey
                 * for the scheduled message
                 *
                 * append ${schedule.interval}${idx} to sortKey to make unique within block/timestamp.
                 * It will also enable performing range queries to fetch all scheduled messages by simply
                 * appending a ',' to any sortKey
                 */
                sortKey: `${curBlock.height},${curBlockMills},${leftHash},${schedule.interval}${idx}`,
                AoGlobal: {
                  process: { id: processId, owner: processOwner },
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
      for (let curEpoch = curBlockMills; curEpoch < nextBlockMillis; curEpoch += 1000) {
        scheduledMessages.push.apply(
          scheduledMessages,
          timeBased.reduce(
            (acc, schedule, idx) => {
              if ((curEpoch - originBlock.timestamp) % schedule.value === 0) {
                acc.push({
                  message: {
                    target: processId,
                    owner: processOwner,
                    tags: schedule.message
                  },
                  /**
                   * TODO: don't know if this is correct, but we need something unique for the sortKey
                   * for the scheduled message
                   *
                   * append ${schedule.interval}${idx} to sortKey to make unique within block/timestamp.
                   * It will also enable performing range queries to fetch all scheduled messages by simply
                   * appending a ',' to any sortKey
                   */
                  sortKey: `${curBlock.height},${curBlockMills},${leftHash},${schedule.interval}${idx}`,
                  AoGlobal: {
                    process: { id: processId, owner: processOwner },
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

    return scheduledMessages
  }

  return ([left, right]) => {
    const messages = []
    messages.push.apply(messages, maybeScheduledMessages(left, right))
    /**
     * Sandwich the scheduled messages between the two actual messages
     */
    messages.unshift(left)
    messages.push(right)
    return messages
  }
}

function loadLatestEvaluationWith ({ findLatestEvaluation, logger }) {
  findLatestEvaluation = fromPromise(findLatestEvaluationSchema.implement(findLatestEvaluation))

  return (ctx) => of(ctx)
    .chain(args => findLatestEvaluation({ processId: args.id, to: args.to })) // 'to' could be undefined
    .bimap(
      logger.tap('Could not find latest evaluation in db. Using intial process as state'),
      logger.tap('found evaluation in db %j. Using as state and starting point to load messages')
    )
    .bichain(
      /**
       * Initial Process State
       */
      () => Resolved({
        state: parseTags(ctx.tags),
        result: {
          error: undefined,
          messages: [],
          output: [],
          spawns: []
        },
        from: undefined,
        evaluatedAt: undefined
      }),
      /**
       * State from evaluation we found in cache
       */
      (evaluation) => Resolved({
        state: evaluation.output.state,
        result: evaluation.output.result,
        from: evaluation.sortKey,
        evaluatedAt: evaluation.evaluatedAt
      })
    )
}

function loadSequencedMessagesWith ({ loadMessages, loadBlocksMeta }) {
  loadMessages = fromPromise(loadMessagesSchema.implement(loadMessages))

  return (ctx) => of(ctx)
    .chain(args => loadMessages({
      processId: args.id,
      owner: args.owner,
      from: args.from, // could be undefined
      to: args.to // could be undefined
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
        .map(blockRange => ({ sequenced, blockRange }))
    })
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
                const scheduleMessagesBetween = scheduleMessagesBetweenWith({
                  processId: ctx.id,
                  owner: ctx.owner,
                  originBlock: ctx.originBlock,
                  blockRange: ctx.blockRange,
                  schedules,
                  suTime
                })

                return reduce(
                  (merged, pair) => {
                    merged.push.apply(merged, scheduleMessagesBetween(pair))
                    return merged
                  },
                  [],
                  pairs
                )
              })
          )
    )
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
   * Messages to be evaluated
   */
  messages: z.array(messageSchema),
  /**
   * The most recent state. This could be the most recent
   * cached state, or potentially the initial state
   * if no interactions are cached
   */
  state: z.record(z.any()),
  /**
   * The most recent result. This could be the most recent
   * cached result, or potentially nothing
   * if no interactions are cached
   */
  result: z.record(z.any()).optional(),
  /**
   * The most recent message sortKey. This could be from the most recent
   * cached evaluation, or undefined, if no evaluations were cached
   *
   * This will be used to subsequently determine which messaged
   * need to be fetched from the SU in order to perform the evaluation
   */
  from: z.coerce.string().optional(),
  /**
   * When the evaluation record was created in the local db. If the initial state had to be retrieved
   * from Arweave, due to no state being cached in the local db, then this will be undefined.
   */
  evaluatedAt: z.date().optional()
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

  const loadLatestEvaluation = loadLatestEvaluationWith(env)
  const loadSequencedMessages = loadSequencedMessagesWith(env)
  const loadScheduledMessages = loadScheduledMessagesWith(env)

  return (ctx) =>
    of(ctx)
      .chain(loadLatestEvaluation)
      // { id, owner, ..., state, result, from, evaluatedAt }
      .map(mergeRight(ctx))
      .chain(ctx =>
        loadSequencedMessages(ctx)
          // { sequenced, blockRange }
          .chain(loadScheduledMessages)
          // { messages }
          .map(mergeRight(ctx))
      )
      .map(ctxSchema.parse)
      .map(logger.tap('Loaded messages and appended to context %j'))
}
