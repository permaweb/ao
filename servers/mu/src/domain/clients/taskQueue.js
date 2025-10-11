import createKeccakHash from 'keccak'
import { Point } from '@noble/secp256k1'
import bs58 from 'bs58'

import { randomBytes } from 'crypto'
import { TASKS_TABLE } from './sqlite.js'

/**
 * Create our task queue.
 * Check if using a "persisted" queue Id
 * by querying the database for tasks with that queue Id.
 * If there are results, set them as initial array.
 * Otherwise, start with an empty array.
 *
 */
export async function createTaskQueue ({ queueId, logger, db }) {
  logger({ log: `Initializing queue for queue index ${queueId}` })
  function createDeleteQuery () {
    return {
      sql: `
        DELETE FROM ${TASKS_TABLE}
        WHERE queueId = ? AND timestamp < (strftime('%s', 'now') - 3600) * 1000;
      `,
      parameters: [
        queueId
      ]
    }
  }

  function createQuery () {
    return {
      sql: `
        SELECT * FROM ${TASKS_TABLE}
        WHERE queueId = ?
        ORDER BY timestamp DESC
      `,
      parameters: [
        queueId
      ]
    }
  }

  await db.run(createDeleteQuery())
  await db.run({ sql: 'VACUUM;', parameters: [] })
  const queryResults = (await db.query(createQuery())).map((row) => ({ ...JSON.parse(row.data), dbId: row.id }))
  const taskQueue = queryResults || []
  return taskQueue
}

/**
 * Enqueue a task onto our task queue.
 * Write it to the database after
 * adding it to the queue. Tasks are identified
 * by a dbId, which includes the queueId, timestamp,
 * and a random hex string. This is so that it can
 * be removed from the database when dequeuing.
 */
export function enqueueWith ({ queue, queueId, logger, db, getRecentTraces, toAddress, getRateLimits, IP_WALLET_RATE_LIMIT, IP_WALLET_RATE_LIMIT_INTERVAL, rateLimits }) {
  /**
   * Derive Ethereum address from secp256k1 public key (compressed or uncompressed)
   * Follows EIP-55 checksum standard
   */
  function keyToEthereumAddress (key) {
    const keyBytes = Buffer.from(key, 'base64url')

    // Decompress if needed (33-byte compressed → 65-byte uncompressed)
    let uncompressed
    if (keyBytes.length === 65) {
      // Already uncompressed (0x04 prefix + 64 bytes)
      uncompressed = keyBytes
    } else if (keyBytes.length === 33) {
      // Compressed key (0x02 or 0x03 prefix + 32 bytes)
      const point = Point.fromHex(keyBytes)
      uncompressed = Buffer.from(point.toRawBytes(false)) // false = uncompressed
    } else {
      throw new Error(`Invalid ECDSA public key length: ${keyBytes.length}`)
    }

    // Hash the 64 bytes after the 0x04 prefix
    const address = createKeccakHash('keccak256')
      .update(uncompressed.slice(1))
      .digest('hex')
      .slice(-40) // Last 20 bytes

    // Apply EIP-55 checksum
    const hash = createKeccakHash('keccak256')
      .update(address)
      .digest('hex')

    let checksumAddress = '0x'
    for (let i = 0; i < address.length; i++) {
      checksumAddress += parseInt(hash[i], 16) >= 8
        ? address[i].toUpperCase()
        : address[i]
    }

    return checksumAddress
  }

  /**
   * Derive Solana address from Ed25519 public key (base58 encoding)
   */
  function keyToSolanaAddress (key) {
    const keyBytes = Buffer.from(key, 'base64url')
    if (keyBytes.length !== 32) {
      throw new Error(`Invalid Ed25519 public key length: ${keyBytes.length}`)
    }
    return bs58.encode(keyBytes)
  }

  async function checkRateLimitExceeded (task) {
    function calculateRateLimit (walletID, procID, limits) {
      if (!walletID) return 100
      if (!limits || Object.keys(limits).length === 0) return 50
      const userBase = Number(limits?.addresses?.[walletID] ?? 0) + Number(limits.default)
      const processLimits = limits?.processes?.[procID] ?? {}
      const processDivisor = Number(processLimits?.divide ?? 1)
      const processSubtractor = Number(processLimits?.subtract ?? 0)
      return Math.max(0, (userBase / processDivisor) - processSubtractor)
    }
    const intervalStart = new Date().getTime() - IP_WALLET_RATE_LIMIT_INTERVAL
    const wallet = task?.wallet || task?.cachedMsg?.wallet || null
    const processId = task?.cachedMsg?.msg?.Target || task?.processId || null
    let address = task?.cachedMsg?.cron ? wallet : await toAddress(wallet)
    const owner = (task.parentOwner ?? task?.wallet ?? task.cachedMsg?.wallet)

    // Detect signature type by base64url length to derive appropriate address
    if (owner?.length === 87) {
      // ECDSA signature (65 bytes) - Ethereum
      address = keyToEthereumAddress(owner)
    } else if (owner?.length === 86) {
      // Ed25519 signature (64 bytes) - Solana
      address = keyToSolanaAddress(owner)
    }

    const rateLimits = getRateLimits()
    const isWhitelisted = (rateLimits?.ips?.[task?.ip] ?? 0) > 1
    if (isWhitelisted) return false
    const rateLimitAllowance = calculateRateLimit(address, processId, rateLimits)
    const recentTraces = await getRecentTraces({ wallet, ip: task.ip, timestamp: intervalStart, processId, isSpawn: task?.type === 'SPAWN' })
    const walletTracesCount = recentTraces.wallet.length
    console.log(`Rate limit result for address ${address}, ${walletTracesCount} wallet traces found, ${rateLimitAllowance} rate limit allowance`)
    if (walletTracesCount >= rateLimitAllowance) {
      logger({ log: 'Rate limit exceeded. Skipping enqueueing task.' })
      return true
    }
    return false
  }
  function createQuery (task, dbId, timestamp) {
    return {
      sql: `
        INSERT OR IGNORE INTO ${TASKS_TABLE}
        (id, queueId, timestamp, data)
        VALUES (?, ?, ?, ?)
      `,
      parameters: [
        dbId,
        queueId,
        timestamp,
        JSON.stringify(task)
      ]
    }
  }
  return async (task) => {
    const rateLimitExceeded = await checkRateLimitExceeded(task)
    if (rateLimitExceeded) return
    const timestamp = new Date().getTime()
    const randomByteString = randomBytes(8).toString('hex')
    const dbId = `${queueId}-${timestamp}-${randomByteString}`
    queue.push({ ...task, dbId })
    db.run(createQuery(task, dbId, timestamp))
  }
}

/**
 * Dequeue a task from the task queue.
 * Also add the ID to our dequeuedTask
 * set for later removal from the db.
 */
export function dequeueWith ({ queue, dequeuedTasks }) {
  return () => {
    if (queue.length === 0) {
      return null
    }
    const dequeuedTask = queue.shift()

    dequeuedTasks.add(dequeuedTask.dbId)
    return dequeuedTask
  }
}

/**
 * Remove dequeued tasks from the db.
 * Remove all DB records with ids that are present
 * in our dequeuedTasks set. Upon calling the function,
 * create a copy of the set using Array.from().
 * This deals with overwrite issues - only the tasks in the set
 * at the time of copying will be removed from the db and set.
 */
export function removeDequeuedTasksWith ({ dequeuedTasks, queueId, db }) {
  function createQuery (dequeuedTasks) {
    return {
      sql: `
        DELETE FROM ${TASKS_TABLE}
        WHERE id IN (${Array.from(dequeuedTasks).map(() => '?').join(',')}) OR timestamp < (strftime('%s', 'now') - 3600) * 1000;
      `,
      parameters: Array.from(dequeuedTasks)
    }
  }
  return () => {
    const taskCopy = Array.from(dequeuedTasks)
    if (!taskCopy.length) return

    const query = createQuery(taskCopy)

    db.run(query)
    db.run({ sql: 'VACUUM;', parameters: [] })
    taskCopy.forEach((task) => {
      dequeuedTasks.delete(task)
    })
  }
}
