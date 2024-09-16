import Libhoney from 'libhoney'
import Database from 'better-sqlite3'
import fs from 'fs'

export class CompositeTransport {
  constructor (transports) {
    this.transports = transports // An array of transport instances
  }

  sendEvents (events, processId, nonce) {
    this.transports.forEach((transport) => {
      transport.sendEvents(events, processId, nonce)
    })
  }
}

export class ConsoleTransport {
  sendEvents (events, processId, nonce) {
    console.log(
      `[ProcID: ${processId}; Nonce: ${nonce}]: Vacuumed events:`,
      events
    )
  }
}

export class HoneycombTransport {
  constructor (writeKey, dataset, apiHost = 'https://api.honeycomb.io', dbFilePath = './largest_nonces.db') {
    this.apiHost = apiHost
    this.writeKey = writeKey
    this.honey = new Libhoney({
      writeKey,
      dataset,
      apiHost
    })
    this.dbFilePath = dbFilePath
    this.dbInitialized = false
    this.db = undefined
    this.largestNonces = {}
  }

  ensureLargestNonces () {
    if (!this.dbInitialized) {
      console.log('[hc-transport]: Initializing SQLite database...')
      if (!fs.existsSync(this.dbFilePath)) {
        this.createDatabase()
      } else {
        this.db = new Database(this.dbFilePath)
        this.loadLargestNonces()
      }
      this.dbInitialized = true
    }
  }

  createDatabase () {
    console.log('[hc-transport]: Creating, if necessary, SQLite database and table for largest nonces...')
    this.db = new Database(this.dbFilePath)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS largest_nonces (
      processId TEXT PRIMARY KEY,
      nonce INTEGER
      );
    `)
  }

  loadLargestNonces () {
    const stmt = this.db.prepare('SELECT processId, nonce FROM largest_nonces')
    const rows = stmt.all()
    for (const row of rows) {
      this.largestNonces[row.processId] = row.nonce
    };
    console.log(`[hc-transport]: Loaded largest nonces:\n${JSON.stringify(this.largestNonces, null, 2)}`)
  }

  getLargestNonce (processId) {
    return this.largestNonces[processId] || 0 // TODO: is -1 more appropriate?
  }

  updateLargestNonce (processId, nonce) {
    const stmt = this.db.prepare(`
    INSERT INTO largest_nonces (processId, nonce)
    VALUES (?, ?)
    ON CONFLICT(processId) DO UPDATE SET nonce = excluded.nonce WHERE excluded.nonce > largest_nonces.nonce;
    `)
    stmt.run(processId, nonce)
    console.log(`[hc-transport]: [ProcID: ${processId}; Nonce: ${nonce}]: Updated largest nonce in db.`)
    this.largestNonces[processId] = nonce
  }

  async sendEvents (events, processId, nonce) {
    this.ensureLargestNonces()
    const currentMaxNonce = this.getLargestNonce(processId)

    if (nonce > currentMaxNonce) {
      events.forEach((event) => {
        this.honey.newEvent().add({
          processId,
          nonce,
          ...event
        }).send()
        this.updateLargestNonce(processId, nonce)
      })
      console.log(
        `[hc-transport]: [ProcID: ${processId}; Nonce: ${nonce}]: Sent events to Honeycomb.`
      )
    } else {
      console.log(
        `[hc-transport]: [ProcID: ${processId}; Nonce: ${nonce}]: Skipped event since nonce is not larger than the max known nonce ${currentMaxNonce}.`
      )
    }
  }
}
