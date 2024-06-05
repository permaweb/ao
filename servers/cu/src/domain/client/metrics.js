import { randomBytes } from 'node:crypto'
import PromClient from 'prom-client'

export const initializeRuntimeMetricsWith = ({ prefix = 'ao_cu' } = {}) => {
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

export const gaugeWith = ({ prefix = 'ao_cu' } = {}) => {
  return ({ name, description, collect }) => {
    const g = new PromClient.Gauge({ name: `${prefix}_${name}`, help: description, collect, enableExemplars: true })

    return {
      inc: (n) => g.inc(n),
      dec: (n) => g.dec(n),
      set: (n) => g.set(n)
    }
  }
}

export const histogramWith = ({ prefix = 'ao_cu' } = {}) => {
  return ({ name, description, buckets, labelNames = [] }) => {
    const h = new PromClient.Histogram({ name: `${prefix}_${name}`, help: description, buckets, labelNames, enableExemplars: true })

    return {
      observe: (v) => h.observe(v),
      startTimer: (labels, exemplars) => h.startTimer(labels, exemplars)
    }
  }
}
