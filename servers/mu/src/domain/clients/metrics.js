import { randomBytes } from 'node:crypto'
import PromClient from 'prom-client'

PromClient.register.setContentType(PromClient.Registry.OPENMETRICS_CONTENT_TYPE)

export const initializeRuntimeMetricsWith = ({ prefix = 'ao_mu' } = {}) => {
  let initialized = false

  return () => {
    if (initialized) return PromClient.register

    PromClient.collectDefaultMetrics({ prefix })
    initialized = true
    return PromClient.register
  }
}

/**
 * Simple for now, maybe hook into something like Prometheus later
 */
export const timer = (label, ctx) => {
  if (process.env.DEBUG) {
    label = `${label}-${randomBytes(4).toString('hex')}`
    console.time(label)
    console.timeLog(label, 'start', JSON.stringify(ctx))
  }
  return {
    stop: () => {
      if (process.env.DEBUG) console.timeEnd(label)
    }
  }
}

export const counterWith = ({ prefix = 'ao_mu' } = {}) => {
  return ({ name, description, labelNames = [] }) => {
    const c = new PromClient.Counter({
      name: `${prefix}_${name}`,
      help: description,
      labelNames,
      enableExemplars: true
    })

    return {
      inc: (n) => c.inc(n)
    }
  }
}

export const gaugeWith = ({ prefix = 'ao_mu' } = {}) => {
  return ({ name, description, collect, labelNames = [] }) => {
    const g = new PromClient.Gauge({
      name: `${prefix}_${name}`,
      help: description,
      labelNames,
      /**
       * We abstract the use of 'this'
       * to the collect function here.
       *
       * This way, the client may provide a function
       * that simply returns the collected value to set,
       * which will this call set here
       */
      ...(collect
        ? { collect: async function () { this.set(await collect()) } }
        : {}
      ),
      enableExemplars: true
    })

    return {
      inc: (n) => g.inc(n),
      dec: (n) => g.dec(n),
      set: (n) => g.set(n)
    }
  }
}

export const histogramWith = ({ prefix = 'ao_mu' } = {}) => {
  return ({ name, description, buckets, labelNames = [] }) => {
    const h = new PromClient.Histogram({ name: `${prefix}_${name}`, help: description, buckets, labelNames, enableExemplars: true })

    return {
      observe: (v) => h.observe(v),
      startTimer: (labels, exemplars) => h.startTimer(labels, exemplars)
    }
  }
}

export const summaryWith = ({ prefix = 'ao_mu' } = {}) => {
  const DEFAULT_MAX_AGE_SECONDS = 300
  const DEFAULT_MAX_AGE_BUCKETS = 3
  const DEFAULT_PERCENTILES = [0.01, 0.05, 0.5, 0.9, 0.95, 0.99]

  return ({ name, description, percentiles, maxAgeSeconds, ageBuckets, labelNames = [] }) => {
    const s = new PromClient.Summary({
      name: `${prefix}_${name}`,
      help: description,
      percentiles: percentiles || DEFAULT_PERCENTILES,
      labelNames,
      maxAgeSeconds: maxAgeSeconds || DEFAULT_MAX_AGE_SECONDS,
      ageBuckets: ageBuckets || DEFAULT_MAX_AGE_BUCKETS,
      enableExemplars: true
    })

    return {
      observe: (v) => s.observe(v),
      startTimer: (labels, exemplars) => s.startTimer(labels, exemplars)
    }
  }
}
