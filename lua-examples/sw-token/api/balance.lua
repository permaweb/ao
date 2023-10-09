local Either = require('common.either')
local util = require('common.util')

local M = {}

function M.balance(state, action)
  return Either.of({
    state = state,
    action = action
  }).fold(util.error, util.success)
end

return M
