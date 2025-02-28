import { Transform } from 'node:stream'

import { Resolved, fromPromise, of } from 'hyper-async'
import { T, always, ascend, cond, equals, identity, ifElse, isNil, last, length, pipe, prop, reduce, uniqBy } from 'ramda'
import ms from 'ms'

import { mapFrom, parseTags } from '../utils.js'
import { findBlocksSchema, loadBlocksMetaSchema, loadMessagesSchema, loadTimestampSchema, saveBlocksSchema } from '../dal.js'

export const toSeconds = (millis) => Math.floor(millis / 1000)

export function findMissingBlocksIn (blocks, { min, maxTimestamp }) {
  if (!blocks.length) return { min, maxTimestamp }

  const missing = []
  const maxBlock = last(blocks)

  for (let height = min; height < maxBlock.height; height++) {
    if (!blocks.find((block) => block.height === height)) missing.push(height)
  }

  if (!missing.length) {
    /**
     * New blocks are added every ~2 minutes. So we check if the difference
     * between the maxBlock and maxTimestamp is more than 90 seconds (to afford some wiggle room).
     *
     * If not, we can be confident that there is no missing block metadata between our
     * latest block found and the maxTimestamp
     *
     * TODO: probably a better way to do this.
     */
    if (toSeconds(maxTimestamp) - toSeconds(maxBlock.timestamp) <= 90) return undefined
    /**
     * The only blocks missing are between the latest block found,
     * and the maxTimestamp
     */
    return { min: maxBlock.height, maxTimestamp }
  }

  /**
   * TODO:
   *
   * The purpose of this function to find the holes in the incremental sequence of block meta.
   * This impl returns one "large" hole to fetch from the gateway.
   *
   * An optimization would be to split the "large" hold into more reasonably sized "small" holes,
   * and fetch those. aka. more resolution and less data unnecessarily loaded from the gateway
   */
  return { min: Math.min(...missing), maxTimestamp }
}

export function mergeBlocks (fromDb, fromGateway) {
  let dbIdx = 0
  let gatewayIdx = 0
  const merged = []

  /**
   * Incrementally traverse the lists of blocks, pushing the smallest
   * on the merged list, as we go.
   */
  while (dbIdx < fromDb.length && gatewayIdx < fromGateway.length) {
    if (fromDb[dbIdx].height < fromGateway[gatewayIdx].height) merged.push(fromDb[dbIdx++])
    else merged.push(fromGateway[gatewayIdx++])
  }

  /**
   * Whichever list has remaining elements, simply push them onto the list.
   *
   * This is safe to do because each list starts sorted, and so the difference here
   * will be safe to append to the end of the merged array
   */
  if (dbIdx < fromDb.length) merged.push.apply(merged, fromDb)
  if (gatewayIdx < fromGateway.length) merged.push.apply(merged, fromGateway)

  /**
   * Probably a more efficient way to do this.
   *
   * This works for now.
   */
  return uniqBy(prop('height'), merged)
}

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
        always({ interval, unit: 'seconds', value: toSeconds(ms([value, unit].join(' '))) }),
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
  timestamp = toSeconds(timestamp)
  originTimestamp = toSeconds(originTimestamp)
  /**
   * don't count the origin timestamp as a match
   */
  if (timestamp === originTimestamp) return false
  return (timestamp - originTimestamp) % cron.value === 0
}

export function cronMessagesBetweenWith ({
  processId,
  owner: processOwner,
  tags: processTags,
  moduleId,
  moduleOwner,
  moduleTags,
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
      if (nextBlock && toSeconds(curTimestamp) >= toSeconds(nextBlock.timestamp)) {
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
            yield {
              cron: `${i}-${cron.interval}`,
              ordinate: leftOrdinate,
              name: `Cron Message ${curBlock.timestamp},${leftOrdinate},${i}-${cron.interval}`,
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
                Process: { Id: processId, Owner: processOwner, Tags: processTags },
                Module: { Id: moduleId, Owner: moduleOwner, Tags: moduleTags }
              }
            }
          }
        }
      }

      for (let i = 0; i < timeBased.length; i++) {
        const cron = timeBased[i]

        if (isTimestampOnCron({ timestamp: curTimestamp, originTimestamp: originBlock.timestamp, cron })) {
          yield {
            cron: `${i}-${cron.interval}`,
            ordinate: leftOrdinate,
            name: `Cron Message ${curTimestamp},${leftOrdinate},${i}-${cron.interval}`,
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
              Process: { Id: processId, Owner: processOwner, Tags: processTags },
              Module: { Id: moduleId, Owner: moduleOwner, Tags: moduleTags }
            }
          }
        }
      }
    }
  }
}

function reconcileBlocksWith ({ loadBlocksMeta, findBlocks, saveBlocks }) {
  findBlocks = fromPromise(findBlocksSchema.implement(findBlocks))
  saveBlocks = fromPromise(saveBlocksSchema.implement(saveBlocks))
  loadBlocksMeta = fromPromise(loadBlocksMetaSchema.implement(loadBlocksMeta))

  return ({ min, maxTimestamp }) => {
    /**
     * Find any blocks that are cached in the range
     */
    return findBlocks({ minHeight: min, maxTimestamp })
      .chain((fromDb) => {
        return of(fromDb)
          /**
           * find the all-encompassing range of all missing blocks
           * between the minimum block, and the maxTimestamp
           */
          .map((fromDb) => findMissingBlocksIn(fromDb, { min, maxTimestamp }))
          .chain((missingRange) => {
            if (!missingRange) return Resolved(fromDb)

            /**
             * Load any missing blocks within the determined range,
             * from the gateway
             */
            return loadBlocksMeta(missingRange)
              /**
               * Cache any fetched blocks for next time
               *
               * This will definitely result in individual 409s for existing blocks,
               * but those shouldn't impact anything and are swallowed
               */
              .chain((fromGateway) => saveBlocks(fromGateway).map(() => fromGateway))
              .map((fromGateway) => mergeBlocks(fromDb, fromGateway))
          })
      })
  }
}

export function maybePrependProcessMessage (ctx, logger, loadTransactionData) {
  return async function * ($messages) {
    const isColdStart = isNil(ctx.from)

    /**
     * Generate and emit a message that represents the process itself
     * if the Process was started before the aop6 Boot Loader change
     *
     * It will be the first message evaluated by the module
     */

    const messages = $messages[Symbol.asyncIterator]()

    /**
     * { value: any, done: boolean }
     */
    let message = await messages.next()

    if (isColdStart) {
      const { value, done } = message
      /**
       * This condition is to handle 3 cases. Before aop6 ECHO Boot loader,
       * The first Message in a stream will be an actual Message. But after
       * aop6 the first Message is now the process itself, shaped like a Message
       *
       * As a result, old Processes that were started before the boot loader
       * change, can either 1. have no Messages, 2. have the first Message with a tag
       * of type Message, as opposed to Process, Or 3. an old Process can have a its
       * first Message be a Cron. In these cases on a cold start we need to
       * inject the Process as the first Message in the stream, as was done
       * prior to the Boot Loader change.
       *
       * See https://github.com/permaweb/ao/issues/730
       */
      if (done || (parseTags(value.message.Tags).Type !== 'Process') || value.message.Cron) {
        logger('Emitting process message at beginning of evaluation stream for process %s cold start', ctx.id)

        /**
         * data for a process can potentially be very large, and it's only needed
         * as part of the very first process message sent to the process (aka. Bootloader).
         *
         * So in lieu of caching the process data, we fetch it once here, on cold start,
         */
        const processData = await loadTransactionData(ctx.id).then(res => res.text())

        yield {
          /**
           * Ensure the noSave flag is set, so evaluation does not persist
           * this process message
           */
          noSave: true,
          ordinate: '0',
          name: `Process Message ${ctx.id}`,
          message: {
            Id: ctx.id,
            Signature: ctx.signature,
            Data: processData,
            Owner: ctx.owner,
            /**
             * the target of the process message is itself
             */
            Target: ctx.id,
            Anchor: ctx.anchor,
            /**
             * Since a process may be spawned from another process,
             * the owner may not always be an "end user" wallet,
             * but the MU wallet that signed and pushed the spawn.
             *
             * The MU sets From-Process on any data item it pushes
             * on behalf of a process, including spawns.
             *
             * So we can set From here using the Process tags
             * and owner, just like we do for any other message
             */
            From: mapFrom({ tags: ctx.tags, owner: ctx.owner }),
            Tags: ctx.tags,
            Epoch: undefined,
            Nonce: undefined,
            Timestamp: ctx.block.timestamp,
            'Block-Height': ctx.block.height,
            Cron: false
          },
          AoGlobal: {
            Process: { Id: ctx.id, Owner: ctx.owner, Tags: ctx.tags },
            Module: { Id: ctx.moduleId, Owner: ctx.moduleOwner, Tags: ctx.moduleTags }
          }
        }
      }
    }

    /**
     * Emit the merged stream of Cron and Scheduled Messages
     */
    while (!message.done) {
      yield message.value
      message = await messages.next()
    }
  }
}

function loadScheduledMessagesWith ({ loadMessages, logger }) {
  loadMessages = fromPromise(loadMessagesSchema.implement(loadMessages))

  return (ctx) =>
    of(ctx)
      .map(ctx => {
        logger('Initializing AsyncIterable of Scheduled messages for process "%s" between "%s" and "%s"', ctx.id, ctx.from || 'initial', ctx.to || 'latest')
        return ctx
      })
      .chain((ctx) =>
        loadMessages({
          suUrl: ctx.suUrl,
          processId: ctx.id,
          block: ctx.block,
          owner: ctx.owner,
          tags: ctx.tags,
          moduleId: ctx.moduleId,
          moduleOwner: ctx.moduleOwner,
          moduleTags: ctx.moduleTags,
          from: ctx.from, // could be undefined
          fromOrdinate: ctx.ordinate, // could be undefined
          to: ctx.to, // could be undefined
          toOrdinate: ctx.toOrdinate, // could be undefined
          assignmentId: ctx.mostRecentAssignmentId,
          hashChain: ctx.mostRecentHashChain,
          isColdStart: ctx.isColdStart
        })
      )
}

function loadCronMessagesWith ({ loadTimestamp, findBlocks, loadBlocksMeta, loadTransactionData, saveBlocks, logger }) {
  loadTimestamp = fromPromise(loadTimestampSchema.implement(loadTimestamp))

  const reconcileBlocks = reconcileBlocksWith({ findBlocks, loadBlocksMeta, saveBlocks })

  return (ctx) => of(ctx)
    .chain(parseCrons)
    .bimap(
      logger.tap('Failed to parse crons: %j'),
      ifElse(
        length,
        logger.tap('Crons found. Generating cron messages according to Crons: %j'),
        identity
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
      return loadTimestamp({ processId: ctx.id, suUrl: ctx.suUrl })
        .map(logger.tap('loaded current timestamp from SU: %j'))
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
          leftMost: {
            ordinate: ctx.ordinate,
            block: ctx.from
              ? { height: ctx.fromBlockHeight, timestamp: ctx.from }
              : ctx.block
          },
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
        // .map(logger.tap('reconciling blocks meta for scheduled messages in range of %o'))
        .chain(({ leftMost, rightMostTimestamp }) =>
          reconcileBlocks({ min: leftMost.block.height, maxTimestamp: rightMostTimestamp })
            .map(blocksMeta => {
              return {
                leftMost,
                rightMostTimestamp,
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
                  moduleId: ctx.moduleId,
                  moduleOwner: ctx.moduleOwner,
                  moduleTags: ctx.moduleTags,
                  originBlock: ctx.block,
                  blocksMeta,
                  crons
                })
              }
            })
        )
        .map(({ leftMost, rightMostTimestamp, $scheduled, genCronMessages }) => {
          return [
            ...$scheduled,
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
            Transform.from(async function * genBoundariesAsTuples ($scheduled) {
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
              if (toSeconds(prev.block.timestamp) < toSeconds(rightMostTimestamp)) {
                logger(
                  'rightMostBlock at timestamp "%s" is later than latest message at timestamp "%s". Emitting extra set of boundaries on end...',
                  rightMostTimestamp,
                  prev.block.timestamp
                )
                /**
                 * We only ever use the right block's timestamp, so having a right
                 * without a height is fine.
                 */
                yield [false, prev, false, { block: { timestamp: rightMostTimestamp } }]
              }
            }),
            Transform.from(async function * mergedMessages (boundaries) {
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
            })
          ]
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
      return [
        ...$messages,
        Transform.from(maybePrependProcessMessage(ctx, logger, loadTransactionData))
      ]
    })
}

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
      .map(messages => ({ ...ctx, messages }))
}
