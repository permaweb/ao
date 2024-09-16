import Libhoney from 'libhoney'
import Database from 'better-sqlite3'
import fs from 'fs'
import { logger as _logger } from '../logger.js'
import { KinesisClient, PutRecordCommand } from '@aws-sdk/client-kinesis'

export class CompositeTransport {
  constructor (transports) {
    this.transports = transports // An array of transport instances
  }

  async sendEvents (events, processId, nonce, gasUsed, memorySize) {
    for (const transport of this.transports) {
      await transport.sendEvents(events, processId, nonce, gasUsed, memorySize)
    }
  }
}

export class ConsoleTransport {
  constructor () {
    this.logger = _logger.child('console-transport')
  }

  sendEvents (events, processId, nonce, gasUsed, memorySize) {
    this.logger.info(
      `[ProcID: ${processId}; Nonce: ${nonce}; GasUsed: ${gasUsed}; MemorySize: ${memorySize}]: Vacuumed events:\n%O`,
      events
    )
  }
}

class NonceTracker {
  constructor ({ dbFilePath, logger }) {
    this.dbFilePath = dbFilePath
    this.dbInitialized = false
    this.db = undefined
    this.largestNonces = {}
    this.logger = logger
    this.updateNonceStmt = undefined
  }

  createDatabase () {
    const db = new Database(this.dbFilePath)
    this.logger.info('Creating, if necessary, SQLite database and table for largest nonces...')
    db.exec(`
      CREATE TABLE IF NOT EXISTS largest_nonces (
      processId TEXT PRIMARY KEY,
      nonce INTEGER
      );
    `)
    return db
  }

  loadLargestNonces () {
    const stmt = this.db.prepare('SELECT processId, nonce FROM largest_nonces')
    const rows = stmt.all()
    for (const row of rows) {
      this.largestNonces[row.processId] = row.nonce
    };
    this.logger.info(`Loaded largest nonces:\n${JSON.stringify(this.largestNonces, null, 2)}`)
  }

  ensureLargestNonces () {
    if (!this.dbInitialized) {
      this.logger.info('Initializing SQLite database...')
      if (!fs.existsSync(this.dbFilePath)) {
        this.db = this.createDatabase()
      } else {
        this.db = new Database(this.dbFilePath)
        this.loadLargestNonces()
      }
      this.loadLargestNonces()
      this.updateNonceStmt = this.db.prepare(`
        INSERT INTO largest_nonces (processId, nonce)
        VALUES (?, ?)
        ON CONFLICT(processId) DO UPDATE SET nonce = excluded.nonce WHERE excluded.nonce > largest_nonces.nonce;
      `)
      this.dbInitialized = true
    }
  }

  getLargestNonce (processId) {
    this.ensureLargestNonces()
    return this.largestNonces[processId] || 0 // TODO: is -1 more appropriate?
  }

  updateLargestNonce (processId, nonce) {
    this.updateNonceStmt.run(processId, nonce)
    this.logger.info(`[ProcID: ${processId}; Nonce: ${nonce}]: Updated largest nonce in db.`)
    this.largestNonces[processId] = nonce
  }
}

export class HoneycombTransport {
  constructor ({
    writeKey,
    dataset,
    apiHost = 'https://api.honeycomb.io',
    dbFilePath = './largest_nonces.db',
    logger = _logger.child('hc-transport')
  }) {
    this.apiHost = apiHost
    this.writeKey = writeKey
    this.honey = new Libhoney({
      writeKey,
      dataset,
      apiHost
    })
    this.logger = logger
    this.nonceTracker = new NonceTracker({ dbFilePath, logger })
  }

  async sendEvents (events, processId, nonce, gasUsed, memorySize) {
    const currentMaxNonce = this.nonceTracker.getLargestNonce(processId)

    if (nonce > currentMaxNonce) {
      events.forEach((event) => {
        const honeyEvent = this.honey.newEvent()
        honeyEvent.add({
          processId,
          nonce,
          gasUsed,
          memorySize,
          ...event
        })

        // Set the ingest timestamp for the event if one is provided
        if (event.timestamp || event.Timestamp) {
          honeyEvent.timestamp = event.timestamp ?? event.Timestamp
        }
        if (event.sampleRate !== undefined) {
          honeyEvent.sampleRate = event.sampleRate
        }
        honeyEvent.send()
        this.nonceTracker.updateLargestNonce(processId, nonce)
      })
      this.logger.info(`[ProcID: ${processId}; Nonce: ${nonce}]: Sent events to Honeycomb.`)
    } else {
      this.logger.info(`[ProcID: ${processId}; Nonce: ${nonce}]: Skipping previous event (max nonce ${currentMaxNonce}).`)
    }
  }
}

export class KinesisTransport {
  constructor ({
    region = 'us-east-1',
    streamName = 'ao-event-stream-test',
    partitionKey = 'test-key',
    credentials = undefined,
    dbFilePath = './kinesis_largest_nonces.db',
    logger = _logger.child('kinesis-transport')
  }) {
    this.client = new KinesisClient({
      region,
      credentials
    })
    this.streamName = streamName
    this.partitionKey = partitionKey
    this.logger = logger
    this.nonceTracker = new NonceTracker({ dbFilePath, logger })
    this.retryAfterSigErr = true
    this.region = region
    this.credentials = credentials
  }

  async sendEvents (events, processId, nonce, gasUsed, memorySize) {
    const currentMaxNonce = this.nonceTracker.getLargestNonce(processId)

    if (nonce > currentMaxNonce) {
      for (const event of events) {
        const kinesisRecordData = {
          processId,
          nonce,
          gasUsed,
          memorySize,
          ...event
        }

        try {
          const params = {
            StreamName: this.streamName,
            PartitionKey: this.partitionKey,
            Data: JSON.stringify(kinesisRecordData)
          }

          const command = new PutRecordCommand(params)
          await this.client.send(command)
          this.nonceTracker.updateLargestNonce(processId, nonce)
          this.logger.info(`[ProcID: ${processId}; Nonce: ${nonce}]: Sent event to Kinesis.`)
          this.retryAfterSigErr = true
        } catch (error) {
          if (`${error}`.includes('Signature expired') && this.retryAfterSigErr === true) {
            this.logger.error(`[ProcID: ${processId}; Nonce: ${nonce}]: Retrying after Signature Expired error...`)
            this.client = new KinesisClient({
              region: this.region,
              credentials: this.credentials
            })
            this.retryAfterSigErr = false // avoid stack overflow
            await this.sendEvents(events, processId, nonce, gasUsed, memorySize)
          } else {
            this.logger.error(`[ProcID: ${processId}; Nonce: ${nonce}]: Error sending record to Kinesis: ${error}`)
            throw error
          }
        }
      }
    } else {
      this.logger.info(`[ProcID: ${processId}; Nonce: ${nonce}]: Skipping previous event (max nonce ${currentMaxNonce}).`)
    }
  }
}
