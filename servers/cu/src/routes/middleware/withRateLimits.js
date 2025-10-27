/**
 * Extract the IP address from the request
 */
const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIp = req.headers['x-real-ip']
  if (realIp) {
    return realIp
  }

  return req.socket.remoteAddress || req.connection.remoteAddress
}

/**
 * Factory function that creates rate limiting middleware with config
 */
export const createRateLimitMiddleware = (config) => {
  const RATE_LIMIT_WINDOW = config.RATE_LIMIT_WINDOW
  const RATE_LIMIT_MAX_REQUESTS = config.RATE_LIMIT_MAX_REQUESTS
  const RATE_LIMIT_CLEANUP_INTERVAL = config.RATE_LIMIT_CLEANUP_INTERVAL

  if (!RATE_LIMIT_WINDOW || !RATE_LIMIT_MAX_REQUESTS || !RATE_LIMIT_CLEANUP_INTERVAL) {
    return (handler) => (req, res) => {
      req.recordRequest = () => {}
      req.limitRequest = () => {}
      req.removeRequest = () => {}
      return handler(req, res)
    }
  }

  const requestStore = new Map()

  /*
   * Clean up IPs that havent made a request
   */
  setInterval(() => {
    const now = Date.now()
    const cutoff = now - RATE_LIMIT_WINDOW

    for (const [ip, timestamps] of requestStore.entries()) {
      const validTimestamps = timestamps.filter(ts => ts > cutoff)
      if (validTimestamps.length === 0) {
        requestStore.delete(ip)
      } else {
        requestStore.set(ip, validTimestamps)
      }
    }
  }, RATE_LIMIT_CLEANUP_INTERVAL)

  /*
   * Log a request in the limit table
   * Returns the timestamp that was recorded, so it can be removed later
   */
  const recordRequest = (req) => {
    const ip = getClientIp(req)
    const now = Date.now()

    const timestamps = requestStore.get(ip) || []
    timestamps.push(now)
    requestStore.set(ip, timestamps)

    // Store the timestamp on the request object so we can remove it later
    req._rateLimitTimestamp = now
  }

  /*
   * Remove a specific request from the limit table by its timestamp
   * Used to "unrecord" requests that hit the cache
   */
  const removeRequest = (req) => {
    const ip = getClientIp(req)
    const timestamps = requestStore.get(ip) || []

    // Safety check: ensure the timestamp was recorded on this request
    if (timestamps.length === 0 || !req._rateLimitTimestamp) {
      return
    }

    // Find and remove the specific timestamp for this request
    const index = timestamps.indexOf(req._rateLimitTimestamp)
    if (index !== -1) {
      timestamps.splice(index, 1)
    } else {
      // This shouldn't happen, but return if it does
      return
    }

    if (timestamps.length === 0) {
      requestStore.delete(ip)
    } else {
      requestStore.set(ip, timestamps)
    }

    // Clean up the timestamp from the request object
    delete req._rateLimitTimestamp
  }

  /*
   * Determine if a request should be limited
   */
  const limitRequest = (req) => {
    const ip = getClientIp(req)
    const now = Date.now()
    const cutoff = now - RATE_LIMIT_WINDOW

    const timestamps = requestStore.get(ip) || []

    const validTimestamps = timestamps.filter(ts => ts > cutoff)

    if (validTimestamps.length > 0) {
      requestStore.set(ip, validTimestamps)
    } else {
      requestStore.delete(ip)
    }

    return validTimestamps.length >= RATE_LIMIT_MAX_REQUESTS
  }

  /**
   * A middleware that exposes rate limiting functionality
   */
  return (handler) => (req, res) => {
    req.recordRequest = recordRequest
    req.removeRequest = removeRequest
    req.limitRequest = limitRequest
    return handler(req, res)
  }
}
