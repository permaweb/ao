import { zipObj } from 'ramda'

export function statsWith ({ loadWorkerStats, loadMemoryUsage, loadProcessCacheUsage }) {
  return async () => Promise.all([
    loadWorkerStats(),
    loadMemoryUsage(),
    loadProcessCacheUsage()
  ]).then(zipObj(['workers', 'memory', 'processCache']))
}
