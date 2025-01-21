const withUnitMode = (mode) => (handler) => (req, res, next) => {
  const { UNIT_MODE } = req.config

  if (UNIT_MODE !== mode) return res.status(404).send('Not Found')

  return handler(req, res, next)
}

export const withCuMode = withUnitMode('cu')
export const withRuMode = withUnitMode('ru')
