const withProcessRestrictionFrom = ({ extractor }) => (handler) => (req, res, next) => {
  const {
    domain: {
      RESTRICT_PROCESSES
      // TODO: add RESTRICT_TO_PROCESSES and check below
      // See https://github.com/permaweb/ao/pull/587
    }
  } = req

  const processId = extractor(req)

  if (RESTRICT_PROCESSES && RESTRICT_PROCESSES.includes(processId)) return res.status(403).send({ error: `Access denied for process ${processId}` })

  return handler(req, res, next)
}

export const withProcessRestrictionFromPath = withProcessRestrictionFrom({ extractor: (req) => req.params.processId })
export const withProcessRestrictionFromQuery = withProcessRestrictionFrom({ extractor: (req) => req.query['process-id'] })
