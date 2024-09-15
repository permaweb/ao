export class EventVacuum {
  constructor (transport) {
    this.transport = transport
  }

  processLogs (logData, processId, nonce) {
    const events = (logData ?? '')
      .split('\n')
      .map(this.parseJson)
      .filter(this.isEvent)
      .map(({ _e, ...eventData }) => eventData) // Strip the "_e" flag
    this.dispatchEvents(events, processId, nonce)
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

  dispatchEvents (events, processId, nonce) {
    if (events.length === 0) return
    this.transport.sendEvents(events, processId, nonce)
  }
}
