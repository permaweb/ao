import { path, zipObj } from 'ramda'

export function statsWith ({ loadWorkerStats, loadMemoryUsage, loadProcessCacheUsage, gauge }) {
  const workerStatGaugesWith = ({ type }) => {
    const totalWorkers = path([type, 'totalWorkers'])
    const pendingTasks = path([type, 'pendingTasks'])
    const activeTasks = path([type, 'activeTasks'])

    // total workers
    gauge({
      name: `${type.toLowerCase()}_worker_total`,
      description: `The total amount of ${type} workers currently spun-up on the Compute Unit`,
      collect: () => Promise.resolve()
        .then(loadWorkerStats)
        .then(totalWorkers)
    })

    // pending tasks
    gauge({
      name: `${type.toLowerCase()}_worker_pending_tasks_total`,
      description: `The total amount of ${type} pending tasks on the Compute Unit`,
      collect: () => Promise.resolve()
        .then(loadWorkerStats)
        .then(pendingTasks)
    })

    // active tasks
    gauge({
      name: `${type.toLowerCase()}_worker_active_tasks_total`,
      description: `The total amount of ${type} active tasks on the Compute Unit`,
      collect: () => Promise.resolve()
        .then(loadWorkerStats)
        .then(activeTasks)
    })
  }

  workerStatGaugesWith({ type: 'dryRun' })
  workerStatGaugesWith({ type: 'primary' })

  return async () => Promise.all([
    loadWorkerStats(),
    loadMemoryUsage(),
    loadProcessCacheUsage()
  ]).then(zipObj(['workers', 'memory', 'processCache']))
}
