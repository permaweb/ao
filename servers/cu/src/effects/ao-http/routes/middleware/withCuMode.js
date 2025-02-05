const withUnitMode = (modes) => (handler) => (req, res, next) => {
  const { UNIT_MODE } = req.config

  if (!modes.includes(UNIT_MODE)) return res.status(404).send('Not Found')

  return handler(req, res, next)
}

export const withCuMode = withUnitMode(['cu', 'hbu'])
export const withRuMode = withUnitMode(['ru'])
