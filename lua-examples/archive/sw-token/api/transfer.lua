local Either = require('common.either')
local util = require('common.util')

local M = {}

local function validate(payload)
  local target = (payload.action and payload.action.input and payload.action.input.target) or nil
  -- This will be "nil" if it's a string that isn't a number 
  -- (or cant be converted to one for the technical peeps out there).
  -- If that's the case, the "if not qty" will exit Left.
  local qty = (payload.action and payload.action.input and tonumber(payload.action.input.qty)) or nil

  -- you don't have to check this cause there's bigger problems if this isnt there.
  local caller = payload.action.caller

  -- Make sure target exists
  if not target then
    return Either.Left('Please specify a target.')
  end

  -- Make sure target isnt caller
  if target == caller then
    return Either.Left('Target cannot be caller.')
  end

  -- Make sure qty exists
  if not qty then
    return Either.Left('qty must be an integer greater than 0.')
  end

  -- I might be able to just do this up top, dunno
  local safeQty = math.floor(qty);
  -- make sure qty is greater than 0
  if math.floor(qty) < 0 then
    return Either.Left('Invalid token transfer. qty must be an integer greater than 0.')
  end

  if (payload.state.balances[caller] or 0) < math.floor(qty) then
    return Either.Left('Not enough tokens for transfer.')
  end

  -- give the floored value to the transformer
  payload.action.input.qty = safeQty;
  return Either.Right(payload)
end

-- Update balances.
local function updateBalances(payload)
  local state = payload.state
  local target = payload.action.input.target
  local qty = payload.action.input.qty
  local caller = payload.action.caller

  if state.balances[target] then
    state.balances[target] = state.balances[target] + qty
  else
    state.balances[target] = qty
  end

  state.balances[caller] = state.balances[caller] - qty
  return state
end

function M.transfer(state, action, SmartWeave)
  return Either.of({
    state = state,
    action = action
  }).chain(validate).map(updateBalances).fold(util.error, util.success)
end

return M
