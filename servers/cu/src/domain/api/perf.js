import { zipObj } from 'ramda'

export function statsWith ({ loadWorkerStats, loadMemoryUsage, loadProcessCacheUsage, gauge }) {
  gauge({
    name: 'worker_total',
    description: 'The total amount of workers currently spun-up on the Compute Unit',
    labelNames: ['worker_type'],
    collect: (set) => Promise.resolve()
      .then(loadWorkerStats)
      .then(({ primary, dryRun }) => {
        set(primary.totalWorkers + dryRun.totalWorkers)
        set(primary.totalWorkers, { worker_type: 'primary' })
        set(dryRun.totalWorkers, { worker_type: 'dry-run' })
      })
  })

  gauge({
    name: 'worker_tasks_total',
    description: 'The total amount of worker tasks on the Compute Unit',
    labelNames: ['worker_type', 'task_type'],
    collect: (set) => Promise.resolve()
      .then(loadWorkerStats)
      .then(({ primary, dryRun }) => {
        // pending
        set(primary.pendingTasks + dryRun.pendingTasks)
        set(primary.pendingTasks, { worker_type: 'primary', task_type: 'pending' })
        set(dryRun.pendingTasks, { worker_type: 'dry-run', task_type: 'pending' })

        // active
        set(primary.activeTasks + dryRun.activeTasks)
        set(primary.activeTasks, { worker_type: 'primary', task_type: 'active' })
        set(dryRun.activeTasks, { worker_type: 'dry-run', task_type: 'active' })
      })
  })

  return async () => Promise.all([
    loadWorkerStats(),
    loadMemoryUsage(),
    loadProcessCacheUsage()
  ]).then(zipObj(['workers', 'memory', 'processCache']))
}
