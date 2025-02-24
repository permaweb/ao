import { ConsoleTransport, HoneycombTransport, KinesisTransport, CompositeTransport } from './event-transport.js'

export class EventVacuum {
  constructor (transport) {
    this.transport = transport
  }

  async processLogs (logData, processId, nonce, gasUsed, memorySize) {
    if (typeof logData !== 'string') return
    const events = (logData ?? '')
      .split('\n')
      .map(this.parseJson)
      .filter(this.isEvent)
      .map(({ _e, ...eventData }) => eventData) // Strip the "_e" flag
      .map(this.normalizeTimestamps)
    await this.dispatchEvents(events, processId, nonce, gasUsed, memorySize)
  }

  parseJson (line) {
    try {
      const parsed = JSON.parse(line)
      return typeof parsed === 'object' && parsed !== null ? parsed : null
    } catch (e) {
      return undefined
    }
  }

  // Check if the parsed object is a matching event
  isEvent (parsed) {
    return parsed && typeof parsed._e === 'number' && parsed._e === 1
  }

  normalizeTimestamps (event) {
    // Normalize timestamp fields to ISO strings
    for (const timestampKey of ['timestamp', 'Timestamp']) {
      if (event[timestampKey]) {
        try {
          const date = new Date(event[timestampKey])
          event[timestampKey] = date.toISOString()
        } catch (e) {
          delete event[timestampKey]
        }
      }
    }
    return event
  }

  async dispatchEvents (events, processId, nonce, gasUsed, memorySize) {
    if (events.length === 0) return
    await this.transport.sendEvents(events, processId, nonce, gasUsed, memorySize)
  }
}

const transportNames = (process.env.EVENT_VACUUM_TRANSPORTS ?? '').split(';')
const transports = transportNames.map((transportName) => {
  switch (transportName) {
    case 'console':
      return new ConsoleTransport()
    case 'honeycomb':
      return new HoneycombTransport({
        writeKey: process.env.HONEYCOMB_API_KEY,
        dataset: process.env.HONEYCOMB_DATASET
      })
    case 'kinesis':
      return new KinesisTransport({
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        },
        streamName: process.env.KINESIS_STREAM_NAME
      })
    default:
      throw new Error(`Unknown event transport "${transportName}"`)
  }
})

export const eventVacuum = transports.length > 0 ? new EventVacuum(new CompositeTransport(transports)) : undefined
