const { config } = require('../config');
module.exports = async (ctx) => {
  const { updateQueue, registerQueue } = ctx;
  const response = {};

  try {
    response.manifest = await config.nodeManifest;
    response.workersConfig = config.workersConfig;
    // const metricsCompleted = await queue.getMetrics('completed');
    // const metricsFailed = await queue.getMetrics('failed');

    const updateActiveJobs = await updateQueue.getJobs(['active']);
    const updateWaitingJobs = await updateQueue.getJobs(['waiting']);

    const registerActiveJobs = await registerQueue.getJobs(['active']);
    const registerWaitingJobs = await registerQueue.getJobs(['waiting']);

    response.queues_totals = {
      update: {
        active: updateActiveJobs.length,
        waiting: updateWaitingJobs.length
      },
      register: {
        active: registerActiveJobs.length,
        waiting: registerWaitingJobs.length
      }
    };

    response.queues_details = {
      update: {
        active: updateActiveJobs.map(mapJob),
        waiting: updateWaitingJobs.map(mapJob)
      },
      register: {
        active: registerActiveJobs.map(mapJob),
        waiting: registerWaitingJobs.map(mapJob)
      }
    };

    ctx.body = response;
    ctx.status = 200;
  } catch (e) {
    ctx.body = e.message;
    ctx.status = 500;
    throw e;
  }
};

function mapJob(j) {
  return j.id;
}
