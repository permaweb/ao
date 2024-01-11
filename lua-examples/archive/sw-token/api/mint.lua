local Either = require('common.either')
local util = require('common.util')

local M = {}

function M.mint(state, action, SmartWeave)
  return Either.of({
    state = state,
    action = action
  }).fold(util.error, util.success)
end

return M
