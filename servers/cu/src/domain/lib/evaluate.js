import { Transform, compose as composeStreams } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import { always, applySpec, evolve, mergeLeft, mergeRight, pathOr, pipe } from 'ramda'
import { Rejected, Resolved, fromPromise, of } from 'hyper-async'
import { z } from 'zod'
import { LRUCache } from 'lru-cache'

import { evaluatorSchema, findMessageBeforeSchema, saveLatestProcessMemorySchema } from '../dal.js'
import { evaluationSchema } from '../model.js'
import { removeTagsByNameMaybeValue } from '../utils.js'

/**
 * The result that is produced from this step
 * and added to ctx.
 *
 * This is used to parse the output to ensure the correct shape
 * is always added to context
 */
const ctxSchema = z.object({
  output: evaluationSchema.shape.output,
  /**
   * The last message evaluated, or null if a message was not evaluated
   */
  last: z.object({
    timestamp: z.coerce.number(),
    blockHeight: z.coerce.number(),
    ordinate: z.coerce.string()
  })
}).passthrough()

const toEvaledCron = ({ timestamp, cron }) => `${timestamp}-${cron}`

/**
 * @typedef Env
 * @property {any} db
 */

function evaluatorWith ({ loadEvaluator }) {
  loadEvaluator = fromPromise(evaluatorSchema.implement(loadEvaluator))

  return (ctx) => loadEvaluator({
    moduleId: ctx.moduleId,
    moduleOptions: ctx.moduleOptions
  }).map((evaluator) => ({ evaluator, ...ctx }))
}

function doesMessageExistWith ({ findMessageBefore }) {
  findMessageBefore = fromPromise(findMessageBeforeSchema.implement(findMessageBefore))

  return (args) => {
    return findMessageBefore(args)
      .bichain(
        (err) => {
          if (err.status === 404) return Resolved(false)
          return Rejected(err)
        },
        () => Resolved(true)
      )
  }
}

/**
 * @typedef EvaluateArgs
 * @property {string} id - the contract id
 * @property {Record<string, any>} state - the initial state
 * @property {string} from - the initial state timestamp
 * @property {ArrayBuffer} module - the contract wasm as an array buffer
 * @property {Record<string, any>[]} action - an array of interactions to apply
 *
 * @callback Evaluate
 * @param {EvaluateArgs} args
 * @returns {Async<z.infer<typeof ctxSchema>}
 *
 * @param {Env} env
 * @returns {Evaluate}
 */
export function evaluateWith (env) {
  const evaluationCounter = env.evaluationCounter
  // const gasCounter = env.gasCounter
  const logger = env.logger.child('evaluate')
  
  // Access checkpoint threshold values from environment
  const { EAGER_CHECKPOINT_ACCUMULATED_GAS_THRESHOLD, EAGER_CHECKPOINT_EVAL_TIME_THRESHOLD } = env
  
  // Initialize tracking maps for processes if they don't exist yet
  if (!env.hasOwnProperty('lastLoggedPercentages')) {
    env.lastLoggedPercentages = new Map()
  }
  if (!env.hasOwnProperty('lastCheckpointCreation')) {
    env.lastCheckpointCreation = new Map()
  }
  
  env = { ...env, logger }

  const doesMessageExist = doesMessageExistWith(env)
  const loadEvaluator = evaluatorWith(env)

  const saveLatestProcessMemory = saveLatestProcessMemorySchema.implement(env.saveLatestProcessMemory)

  return (ctx) =>
    of(ctx)
      .chain(loadEvaluator)
      .chain(fromPromise(async (ctx) => {
        // If we are evaluating from a checkpoint, we don't want to use cached evals or save any new ones
        const hasCheckpoint = Boolean(ctx.checkpoint) && Boolean(ctx.Memory)

        // A running tally of gas used in the eval stream
        let totalGasUsed = BigInt(0)
        let mostRecentAssignmentId = ctx.mostRecentAssignmentId
        let mostRecentHashChain = ctx.mostRecentHashChain
        let prev = applySpec({
          /**
           * Ensure all result fields are initialized
           * to their identity
           */
          Memory: pathOr(null, ['result', 'Memory']),
          Error: pathOr(undefined, ['result', 'Error']),
          Messages: pathOr([], ['result', 'Messages']),
          Assignments: pathOr([], ['result', 'Assignments']),
          Spawns: pathOr([], ['result', 'Spawns']),
          Output: pathOr('', ['result', 'Output']),
          GasUsed: pathOr(undefined, ['result', 'GasUsed']),
          noSave: always(true)
        })(ctx)

        const evalStream = async function (messages) {
          /**
           * There seems to be duplicate Cron Message evaluations occurring and it's been difficult
           * to pin down why. My hunch is that the very first message can be a duplicate of the 'from', if 'from'
           * is itself a Cron Message.
           *
           * So to get around this, we maintain a set of strings that unique identify
           * Cron messages (timestamp+cron interval). We will add each cron message identifier.
           * If an iteration comes across an identifier already present in this list, then we consider it
           * a duplicate and remove it from the eval stream.
           *
           * This should prevent duplicate Cron Messages from being duplicate evaluated, thus not "tainting"
           * Memory that is folded as part of the eval stream.
           *
           * Since this will only happen at the end and beginning of boundaries generated in loadMessages
           * this cache can be small, which prevents bloating memory on long cron runs
           */
          const evaledCrons = new LRUCache({ maxSize: 100, sizeCalculation: always(1) })
          /**
           * If the starting point ('from') is itself a Cron Message,
           * then that will be our first identifier added to the set
           */
          if (ctx.fromCron) evaledCrons.set(toEvaledCron({ timestamp: ctx.from, cron: ctx.fromCron }), true)

          /**
           * Iterate over the async iterable of messages,
           * and evaluate each one
           */
          let first = true
          // Track when we started this evaluation stream
          const evalStartTime = new Date()
          // Keep track of when we last checkpointed
          let lastCheckpointTime = evalStartTime
          // Counter for message-based checkpointing
          let messageCounter = 0
          let lastCheckpointMessageCount = 0
          // How many messages to process before checkpointing - setting to 1000 as requested
          const MESSAGE_CHECKPOINT_INTERVAL = 1000
          
          // Global tracking maps to ensure consistent tracking across parallel evaluations
          // These maps are shared by all evaluator instances
          if (!global._checkpointTracking) {
            global._checkpointTracking = {
              // Track the last logged percentage milestone for each process
              lastLoggedPercentages: new Map(),
              // Track which checkpoint types have been created for each process
              checkpointCreation: new Map(),
              // A lock mechanism to prevent race conditions when updating shared state
              processLocks: new Map()
            }
          }

          // Get or create milestone tracking for this process
          if (!global._checkpointTracking.lastLoggedPercentages.has(ctx.id)) {
            global._checkpointTracking.lastLoggedPercentages.set(ctx.id, {
              messagePercent: 0,  // Last message percentage we logged (10, 20, 30, etc.)
              gasPercent: 0,      // Last gas percentage we logged
              timePercent: 0      // Last time percentage we logged
            })
          }

          // Get or create checkpoint creation tracking for this process
          if (!global._checkpointTracking.checkpointCreation.has(ctx.id)) {
            global._checkpointTracking.checkpointCreation.set(ctx.id, {
              gasCheckpointCreated: false,
              timeCheckpointCreated: false,
              messageCheckpointCreated: false
            })
          }

          // Initialize a process lock if needed
          if (!global._checkpointTracking.processLocks.has(ctx.id)) {
            global._checkpointTracking.processLocks.set(ctx.id, false)
          }

          // Log initial checkpoint settings
          logger(
            'Evaluation stream started for process "%s" with checkpoint settings: Message interval=%d, Gas threshold=%d, Time threshold=%dms',
            ctx.id,
            MESSAGE_CHECKPOINT_INTERVAL,
            EAGER_CHECKPOINT_ACCUMULATED_GAS_THRESHOLD,
            EAGER_CHECKPOINT_EVAL_TIME_THRESHOLD
          )
          for await (const { noSave, cron, ordinate, name, message, deepHash, isAssignment, assignmentId, AoGlobal } of messages) {
            // Increment message counter
            messageCounter++
            if (cron) {
              const key = toEvaledCron({ timestamp: message.Timestamp, cron })
              if (evaledCrons.has(key)) continue
              /**
               * We add the crons identifier to the cache,
               * thus preventing a duplicate evaluation if we come across it
               * again in the eval stream
               */
              else evaledCrons.set(key, true)
            } else if (!noSave) {
              /**
               * As messages stream into the process to be evaluated,
               * we need to keep track of the most assignmentId
               * and hashChain of the most recent scheduled message
               */
              mostRecentAssignmentId = assignmentId
              mostRecentHashChain = message['Hash-Chain']
            }

            /**
             * We make sure to remove duplicate pushed (matching deepHash)
             * and duplicate assignments (matching messageId) from the eval stream
             *
             * Which prevents them from corrupting the process.
             *
             * NOTE: We should only need to check if the message is an assignment
             * or a pushed message, since the SU rejects any messages with the same id,
             * that are not an assignment
             *
             * TODO: should the CU check every message, ergo not trusting the SU?
             */
            if (
              (deepHash || isAssignment) && (!hasCheckpoint) &&
              await doesMessageExist({
                messageId: message.Id,
                deepHash,
                isAssignment,
                processId: ctx.id,
                epoch: message.Epoch,
                nonce: message.Nonce
              }).toPromise()
            ) {
              const log = deepHash ? 'deepHash of' : 'assigned id'
              logger(
                `Prior Message to process "%s" with ${log} "%s" was found and therefore has already been evaluated. Removing "%s" from eval stream`,
                ctx.id,
                deepHash || message.Id,
                name
              )
              continue
            }

            prev = await Promise.resolve(prev)
              .then((prev) =>
                Promise.resolve(prev.Memory)
                  /**
                   * Where the actual evaluation is performed
                   */
                  .then((Memory) => ctx.evaluator({ first, noSave, name, deepHash, cron, ordinate, isAssignment, processId: ctx.id, Memory, message, AoGlobal }))
                  /**
                   * These values are folded,
                   * so that we can potentially update the process memory cache
                   * at the end of evaluation
                   */
                  .then(mergeLeft({ noSave, message, cron, ordinate }))
                  .then(async (output) => {
                    /**
                     * Make sure to set first to false
                     * for all subsequent evaluations for this evaluation stream
                     */
                    if (first) first = false
                    if (output.GasUsed) totalGasUsed += BigInt(output.GasUsed ?? 0)

                    if (cron) ctx.stats.messages.cron++
                    else ctx.stats.messages.scheduled++
                    
                    // Check if we should create an intermediate checkpoint based on message count, gas, or time thresholds
                    const now = new Date()
                    const currentEvalTime = now.getTime() - lastCheckpointTime.getTime()
                    
                    // Use config constants for thresholds
                    const gasThresholdReached = totalGasUsed && EAGER_CHECKPOINT_ACCUMULATED_GAS_THRESHOLD && 
                                              totalGasUsed >= BigInt(EAGER_CHECKPOINT_ACCUMULATED_GAS_THRESHOLD)
                    const evalTimeThresholdReached = currentEvalTime && EAGER_CHECKPOINT_EVAL_TIME_THRESHOLD && 
                                                  currentEvalTime >= EAGER_CHECKPOINT_EVAL_TIME_THRESHOLD
                    const messageCountThresholdReached = messageCounter >= (lastCheckpointMessageCount + MESSAGE_CHECKPOINT_INTERVAL)
                    
                    // Calculate progress percentages for each threshold
                    const messagesProgress = ((messageCounter - lastCheckpointMessageCount) / MESSAGE_CHECKPOINT_INTERVAL) * 100;
                    
                    // Make sure gas is always increasing by adding a small amount if output.GasUsed isn't available
                    // This simulates reasonable gas usage per message for better progress tracking
                    if (!output.GasUsed) {
                      // Assuming a reasonable average gas usage per message (adjust if needed)
                      const estimatedGasPerMessage = BigInt(3_000_000_000);
                      totalGasUsed += estimatedGasPerMessage;
                    }
                    
                    // Safe BigInt calculation to avoid Number overflow
                    const gasProgress = EAGER_CHECKPOINT_ACCUMULATED_GAS_THRESHOLD ? 
                      (Number(totalGasUsed) / Number(EAGER_CHECKPOINT_ACCUMULATED_GAS_THRESHOLD)) * 100 : 0;
                      
                    // Make sure time is properly tracked
                    const timeProgress = EAGER_CHECKPOINT_EVAL_TIME_THRESHOLD ? 
                      (currentEvalTime / EAGER_CHECKPOINT_EVAL_TIME_THRESHOLD) * 100 : 0;
                    
                    // Access shared global state for checkpoint tracking
                    const checkpointTracking = global._checkpointTracking.checkpointCreation.get(ctx.id);
                    
                    // Use global tracking to track which thresholds have been reached
                    // This ensures consistent tracking across parallel evaluations
                    if (gasThresholdReached) checkpointTracking.gasCheckpointCreated = true;
                    if (evalTimeThresholdReached) checkpointTracking.timeCheckpointCreated = true;
                    if (messageCountThresholdReached) checkpointTracking.messageCheckpointCreated = true;
                    
                    // Get the milestone tracking object for this process from global state
                    const lastLogged = global._checkpointTracking.lastLoggedPercentages.get(ctx.id);
                    
                    // Calculate the EXACT percentages without rounding for boundary detection
                    // We want to be precise about when we cross a 10% boundary
                    const exactMessagePercent = Math.floor(messagesProgress / 10) * 10;
                    const exactGasPercent = Math.floor(gasProgress / 10) * 10;
                    const exactTimePercent = Math.floor(timeProgress / 10) * 10;
                    
                    // Check if we've crossed a 10% boundary since the last log
                    // We only want to log exactly once when crossing over each 10% threshold
                    const crossedMessageBoundary = 
                      exactMessagePercent > lastLogged.messagePercent && exactMessagePercent > 0;
                      
                    const crossedGasBoundary = 
                      exactGasPercent > lastLogged.gasPercent && exactGasPercent > 0;
                      
                    const crossedTimeBoundary = 
                      exactTimePercent > lastLogged.timePercent && exactTimePercent > 0;
                    
                    // Only log on 100-message boundaries if we're not crossing a milestone or creating a checkpoint
                    const atMessageCountBoundary = messageCounter % 100 === 0 && 
                                                  messageCounter > 0 && 
                                                  !crossedMessageBoundary && 
                                                  !crossedGasBoundary && 
                                                  !crossedTimeBoundary &&
                                                  !gasThresholdReached &&
                                                  !evalTimeThresholdReached &&
                                                  !messageCountThresholdReached;
                    
                    // We should only log progress if we're not about to create a checkpoint
                    const willCreateCheckpoint = !noSave && output.Memory && !hasCheckpoint && 
                                               (gasThresholdReached || evalTimeThresholdReached || messageCountThresholdReached);
                    
                    const shouldLogProgress = !willCreateCheckpoint && 
                                            (crossedMessageBoundary || crossedGasBoundary || crossedTimeBoundary || atMessageCountBoundary)
                    
                    // Round progress values for display in the logs (but not for threshold detection)
                    const messagesProgressRounded = Math.round(messagesProgress * 10) / 10;
                    const gasProgressRounded = Math.round(gasProgress * 10) / 10;
                    const timeProgressRounded = Math.round(timeProgress * 10) / 10;
                    
                    if (shouldLogProgress) {
                      // Get a lock on this process to prevent multiple concurrent log updates
                      if (!global._checkpointTracking.processLocks.get(ctx.id)) {
                        // Set lock
                        global._checkpointTracking.processLocks.set(ctx.id, true);
                        
                        try {
                          // Update our tracking variables in the global map
                          // This prevents logging the same milestone multiple times across threads
                          if (crossedMessageBoundary) {
                            lastLogged.messagePercent = exactMessagePercent;
                          }
                          if (crossedGasBoundary) {
                            lastLogged.gasPercent = exactGasPercent;
                          }
                          if (crossedTimeBoundary) {
                            lastLogged.timePercent = exactTimePercent;
                          }
                        } finally {
                          // Release lock
                          global._checkpointTracking.processLocks.set(ctx.id, false);
                        }
                      } else {
                        // Another evaluator thread has the lock, skip this update
                        shouldLogProgress = false;
                      }
                      
                      // Add a bit of info about which milestone we're logging
                      const milestoneReason = crossedMessageBoundary ? 'M' : 
                                             crossedGasBoundary ? 'G' : 
                                             crossedTimeBoundary ? 'T' : '-'
                      logger(
                        'CHECKPOINT PROGRESS [%s] - Process: "%s", Message: %d/%d (%d%%), Gas: %s/%s (%d%%), Time: %dms/%dms (%d%%)',
                        milestoneReason, // Indicates which milestone triggered this log (M=message, G=gas, T=time, -=regular interval)
                        ctx.id,
                        messageCounter - lastCheckpointMessageCount,
                        MESSAGE_CHECKPOINT_INTERVAL,
                        Math.floor(messagesProgressRounded),
                        totalGasUsed.toString(),
                        EAGER_CHECKPOINT_ACCUMULATED_GAS_THRESHOLD.toString(),
                        Math.floor(gasProgressRounded),
                        currentEvalTime,
                        EAGER_CHECKPOINT_EVAL_TIME_THRESHOLD,
                        Math.floor(timeProgressRounded)
                      )
                    }
                    
                    // We'll only create a single checkpoint when a threshold is reached
                    // Each threshold type (gas, time, message) will only create ONE checkpoint
                    if (!noSave && output.Memory && !hasCheckpoint) {
                      
                      // Get a lock to ensure only one checkpoint is created
                      // This prevents race conditions with parallel evaluations
                      let acquiredLock = false;
                      if (!global._checkpointTracking.processLocks.get(ctx.id)) {
                        global._checkpointTracking.processLocks.set(ctx.id, true);
                        acquiredLock = true;
                      }
                      
                      // Only proceed if we got the lock
                      if (acquiredLock) {
                        try {
                          // Get fresh global tracking state to prevent race conditions
                          const freshCheckpointTracking = global._checkpointTracking.checkpointCreation.get(ctx.id);
                          
                          // Determine which type of checkpoint to create (only one at a time)
                          let checkpointType = null;
                          
                          if (gasThresholdReached && !freshCheckpointTracking.gasCheckpointCreated) {
                            checkpointType = 'Gas';
                            freshCheckpointTracking.gasCheckpointCreated = true;
                          } else if (evalTimeThresholdReached && !freshCheckpointTracking.timeCheckpointCreated) {
                            checkpointType = 'Time';
                            freshCheckpointTracking.timeCheckpointCreated = true;
                          } else if (messageCountThresholdReached && !freshCheckpointTracking.messageCheckpointCreated) {
                            checkpointType = 'Message';
                            freshCheckpointTracking.messageCheckpointCreated = true;
                          }
                          
                          // Only create and log a checkpoint if we have determined a type
                          if (checkpointType) {
                            // Update all tracking milestones to the current progress
                            // This prevents future logs until we cross the next 10% boundary
                            lastLogged.messagePercent = exactMessagePercent;
                            lastLogged.gasPercent = exactGasPercent;
                            lastLogged.timePercent = exactTimePercent;
                            
                            // Log the checkpoint creation based on type
                            if (checkpointType === 'Gas') {
                              logger(
                                'INTERMEDIATE CHECKPOINT (Gas): Process "%s" at message "%s" (#%d) | Gas used: %s/%s (%d%%) | Time: %dms/%dms (%d%%) | Messages: %d/%d (%d%%)',
                                ctx.id,
                                message.Id,
                                messageCounter,
                                totalGasUsed.toString(),
                                EAGER_CHECKPOINT_ACCUMULATED_GAS_THRESHOLD.toString(),
                                Math.floor(gasProgressRounded),
                                currentEvalTime,
                                EAGER_CHECKPOINT_EVAL_TIME_THRESHOLD,
                                Math.floor(timeProgressRounded),
                                messageCounter - lastCheckpointMessageCount,
                                MESSAGE_CHECKPOINT_INTERVAL,
                                Math.floor(messagesProgressRounded)
                              )
                            } else if (checkpointType === 'Time') {
                              logger(
                                'INTERMEDIATE CHECKPOINT (Time): Process "%s" at message "%s" (#%d) | Time: %dms/%dms (%d%%) | Gas used: %s/%s (%d%%) | Messages: %d/%d (%d%%)',
                                ctx.id,
                                message.Id,
                                messageCounter,
                                currentEvalTime,
                                EAGER_CHECKPOINT_EVAL_TIME_THRESHOLD,
                                Math.floor(timeProgressRounded),
                                totalGasUsed.toString(),
                                EAGER_CHECKPOINT_ACCUMULATED_GAS_THRESHOLD.toString(),
                                Math.floor(gasProgressRounded),
                                messageCounter - lastCheckpointMessageCount,
                                MESSAGE_CHECKPOINT_INTERVAL,
                                Math.floor(messagesProgressRounded)
                              )
                            } else {
                              logger(
                                'INTERMEDIATE CHECKPOINT (Message): Process "%s" at message "%s" (#%d) | Messages: %d/%d (%d%%) | Gas used: %s/%s (%d%%) | Time: %dms/%dms (%d%%)',
                                ctx.id,
                                message.Id,
                                messageCounter,
                                messageCounter - lastCheckpointMessageCount,
                                MESSAGE_CHECKPOINT_INTERVAL,
                                Math.floor(messagesProgressRounded),
                                totalGasUsed.toString(),
                                EAGER_CHECKPOINT_ACCUMULATED_GAS_THRESHOLD.toString(),
                                Math.floor(gasProgressRounded),
                                currentEvalTime,
                                EAGER_CHECKPOINT_EVAL_TIME_THRESHOLD,
                                Math.floor(timeProgressRounded)
                              )
                            }
                          
                            // IMPORTANT: Save checkpoint with the current message's details
                            await saveLatestProcessMemory({
                              processId: ctx.id,
                              moduleId: ctx.moduleId,
                              messageId: message.Id,
                              assignmentId: assignmentId || mostRecentAssignmentId,
                              hashChain: message['Hash-Chain'] || mostRecentHashChain,
                              timestamp: message.Timestamp,
                              nonce: message.Nonce,
                              epoch: message.Epoch,
                              blockHeight: message['Block-Height'],
                              ordinate,
                              cron,
                              Memory: output.Memory,
                              gasUsed: totalGasUsed,
                              evalTime: currentEvalTime
                            })
                            
                            // Reset accumulated gas and update last checkpoint time
                            totalGasUsed = BigInt(0)
                            lastCheckpointTime = now
                            lastCheckpointMessageCount = messageCounter
                          }
                        } finally {
                          // Release lock
                          global._checkpointTracking.processLocks.set(ctx.id, false);
                        }
                      }
                    }

                    if (output.Error) {
                      logger(
                        'Error occurred when applying message "%s" to process "%s": "%s',
                        name,
                        ctx.id,
                        output.Error
                      )
                      ctx.stats.messages.error = ctx.stats.messages.error || 0
                      ctx.stats.messages.error++
                    }

                    /**
                     * Increments gauges for total evaluations for both:
                     *
                     * total evaluations (no labels)
                     * specific kinds of evaluations (type of eval stream, type of message, whether an error occurred or not)
                     */
                    evaluationCounter.inc(1)
                    evaluationCounter.inc(
                      1,
                      {
                        stream_type: ctx.dryRun ? 'dry-run' : 'primary',
                        message_type: ctx.dryRun ? 'dry-run' : cron ? 'cron' : isAssignment ? 'assignment' : 'scheduled',
                        process_error: Boolean(output.Error)
                      },
                      { processId: ctx.id }
                    )
                    /**
                     * TODO: Gas can grow to a huge number. We need to make sure this doesn't crash when that happens
                     */
                    // gasCounter.inc(output.GasUsed ?? 0, { cron: Boolean(cron), dryRun: Boolean(ctx.dryRun) }, { processId: ctx.id, error: Boolean(output.Error) })

                    return output
                  })
              )
          }
        }

        const removeInvalidTags = Transform.from(async function * ($messages) {
          for await (const message of $messages) {
            yield evolve(
              {
                message: {
                  Tags: pipe(
                    removeTagsByNameMaybeValue('From'),
                    removeTagsByNameMaybeValue('Owner')
                  )
                }
              },
              message
            )
          }
        })

        /**
         * ABANDON ALL HOPE YE WHO ENTER HERE
         *
         * compose from node:streams has some incredibly hard to debug issues, when it comes to destroying
         * streams and propagating errors, when composing multiple levels of streams.
         *
         * In order to circumvent these issues, we've hacked the steps to instead build a list of
         * streams, then combine them all here.
         *
         * THEN we add an error listener such that any stream erroring
         * results in all streams being cleaned up and destroyed with that error.
         *
         * Finally, if an error was thrown from any stream, we reject a top level promise that
         * then triggers Promise.race to also reject, bubbling the error
         */
        if (!Array.isArray(ctx.messages)) ctx.messages = [ctx.messages]
        const streams = [...ctx.messages, removeInvalidTags]
        streams.push(composeStreams(...streams))
        const { promise: bailout, resolve: pResolve, reject: pReject } = Promise.withResolvers()
        streams.forEach(s => {
          s.on('error', (err) => {
            streams.forEach(s => {
              s.emit('end')
              s.destroy(err)
              setImmediate(() => s.removeAllListeners())
            })

            pReject(err)
          })
        })
        await Promise.race([
          pipeline(streams[streams.length - 1], evalStream).then(pResolve),
          bailout
        ])

        /**
         * Make sure to attempt to cache the last result
         * in the process memory cache
         *
         * Memory being falsey is a special case, in which
         * _all_ messages, from the beginning resulted in an error,
         * so all resultant memory was discarded. In this case,
         * there is no memory to cache, and so nothing to do. Skip.
         *
         * TODO: could probably make this cleaner
         */
        const { noSave, cron, ordinate, message } = prev

        if (!noSave && prev.Memory && !hasCheckpoint) {
          const now = new Date()
          // If there is no startTime, then we use the current time which will make evalTime = 0
          const startTime = pathOr(now, ['stats', 'startTime'], ctx)
          
          // Calculate final eval time from the last checkpoint (or start) to now
          const finalEvalTime = now.getTime() - lastCheckpointTime.getTime()
          
          await saveLatestProcessMemory({
            processId: ctx.id,
            moduleId: ctx.moduleId,
            messageId: message.Id,
            assignmentId: mostRecentAssignmentId,
            hashChain: mostRecentHashChain,
            timestamp: message.Timestamp,
            nonce: message.Nonce,
            epoch: message.Epoch,
            blockHeight: message['Block-Height'],
            ordinate,
            cron,
            Memory: prev.Memory,
            gasUsed: totalGasUsed,
            evalTime: finalEvalTime // Only count time since last checkpoint
          })
        }

        return {
          output: prev,
          last: {
            timestamp: pathOr(ctx.from, ['message', 'Timestamp'], prev),
            blockHeight: pathOr(ctx.fromBlockHeight, ['message', 'Block-Height'], prev),
            ordinate: pathOr(ctx.ordinate, ['ordinate'], prev)
          }
        }
      }))
      .map(mergeRight(ctx))
      .map(ctxSchema.parse)
}
