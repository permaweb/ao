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

  if(!RATE_LIMIT_WINDOW || !RATE_LIMIT_MAX_REQUESTS || !RATE_LIMIT_CLEANUP_INTERVAL) {
    return (handler) => (req, res) => {
        req.recordRequest = () => {}
        req.limitRequest = () => {}
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
   */
  const recordRequest = (req) => {
    const ip = getClientIp(req)
    const now = Date.now()

    const timestamps = requestStore.get(ip) || []
    timestamps.push(now)
    requestStore.set(ip, timestamps)
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
    req.limitRequest = limitRequest
    return handler(req, res)
  }
}