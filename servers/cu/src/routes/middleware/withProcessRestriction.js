export const withProcessRestriction = (handler) => (req, res, next) => {
  const {
    params: { processId },
    domain: { RESTRICT_TO_PROCESSES }
  } = req

  if (RESTRICT_TO_PROCESSES && !RESTRICT_TO_PROCESSES.includes(processId)) {
    return res.status(403).send({ error: 'Access denied' })
  }

  return handler(req, res, next)
}
