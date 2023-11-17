local JSON = require("json")

--- EITHER SECTION
--- hyper63/either module (Converted to LUA by jshaw via chatgpt)
---
--- This module implements the either monad the codebase is largely based from Dr. Boolean - Brian Lonsdorf and his
--- frontend masters courses. The two reasons for pulling these into independent modules is that over time
--- we may want to add additional helper functions to the type, and to reduce third party dependencies.
---
--- @table Either
--- @field isLeft function
--- @field chain function
--- @field ap function
--- @field alt function
--- @field extend function
--- @field concat function
--- @field traverse function
--- @field map function
--- @field toString function
--- @field extract function
--- @param x any
--- @return Either
function Right(x)
  return {
    isLeft = false,
    chain = function(f)
      return f(x)
    end,
    ap = function(other)
      return other.map(x)
    end,
    alt = function(other)
      return Right(x)
    end,
    extend = function(f)
      return f(Right(x))
    end,
    concat = function(other)
      return other.fold(function(x)
        return other
      end, function(y)
        return Right(x .. y)
      end)
    end,
    traverse = function(of, f)
      return f(x):map(Right)
    end,
    map = function(f)
      return Right(f(x))
    end,
    fold = function(_, g)
      return g(x)
    end,
    toString = function()
      return "Right(" .. x .. ")"
    end,
    extract = function()
      return x
    end
  }
end

--- @param x any
--- @return Either
function Left(x)
  return {
    isLeft = true,
    chain = function(_)
      return Left(x)
    end,
    ap = function(_)
      return Left(x)
    end,
    extend = function(_)
      return Left(x)
    end,
    alt = function(other)
      return other
    end,
    concat = function(_)
      return Left(x)
    end,
    traverse = function(of, _)
      return of(Left(x))
    end,
    map = function(_)
      return Left(x)
    end,
    fold = function(f, _)
      return f(x)
    end,
    toString = function()
      return "Left(" .. x .. ")"
    end,
    extract = function()
      return x
    end
  }
end

--- @param x any
--- @return Either
function of(x)
  return Right(x)
end

--- @param f function
--- @return Either
function tryCatch(f)
  local success, result = pcall(f)
  if success then
    return Right(result)
  else
    return Left(result)
  end
end

--- @param x any
--- @return Either
function fromNullable(x)
  return x ~= nil and Right(x) or Left(x)
end

Either = {
  Right = Right,
  Left = Left,
  of = of,
  tryCatch = tryCatch,
  fromNullable = fromNullable
}

local process = {
  _version = "0.0.1"
}

local function findTagByName(tags, name)
  for _, tag in ipairs(tags) do
    if tag.name == name then
      return tag
    end
  end
  return nil
end

local function initState()
  local subs = {
    TOM = true,
    SAM = true,
    VINCE = true,
    TYLER = true,
    DMAC = true,
    TIAGO = true
  }

  local subs_count = 0
  for _ in pairs(subs) do
    subs_count = subs_count + 1
  end

  return {
    subs = subs,
    subs_count = subs_count,
    messages_count = 0
  }
end

local function isInSet(value, set)
  return set[value] ~= nil
end

local FUNK_OUTPUTS = {
  sub = 'Subscribed.',
  unsub = 'Unsubscribed.',
  relay = 'Message relayed.'
}

local FunkResponses = {
  error = function(error)
    local errorMsg = error or 'An error occurred';
    return error({
      code = 400,
      message = errorMsg
    })
  end,
  success = function(input)
    local status = FUNK_OUTPUTS[findTagByName(input.msg.tags, 'function').value]
    local forwardedFor = findTagByName(input.msg.tags, "Forwarded-For");
    local tx

    if forwardedFor and forwardedFor.value then
      -- forwardedFor exists and has a value
      tx = forwardedFor.value
    else
      -- forwardedFor is nil or its value is nil
      tx = input.msg.owner
    end

    return {
      output = JSON.encode({
        subs_count = state.subs_count,
        messages_count = state.messages_count,
        [tx] = status,
        state = state
      }),
      messages = input.messages or {},
      spawns = {}
    }
  end
}

local Subscribe = {
  validate = function(input)
    local msg = input.msg
    local forwardedFor = findTagByName(msg.tags, "Forwarded-For");
    local subscriber

    if forwardedFor and forwardedFor.value then
      -- forwardedFor exists and has a value
      subscriber = forwardedFor.value
    else
      -- forwardedFor is nil or its value is nil
      subscriber = msg.owner
    end

    local subscribed = state.subs[subscriber]
    if subscribed then
      return Either.Left('Already subscribed.')
    end
    input.subscriber = subscriber
    return Either.Right(input)
  end,
  addSub = function(input)
    local subscriber = input.subscriber
    state.subs[subscriber] = true
    state.subs_count = state.subs_count + 1
    return input
  end
}

local Unsubscribe = {
  validate = function(input)
    local msg = input.msg
    local forwardedFor = findTagByName(msg.tags, "Forwarded-For");
    local unsubscriber

    if forwardedFor and forwardedFor.value then
      -- forwardedFor exists and has a value
      unsubscriber = forwardedFor.value
    else
      -- forwardedFor is nil or its value is nil
      unsubscriber = msg.owner
    end

    local subscribed = state.subs[unsubscriber]

    if not subscribed then
      return Either.Left('Not subscribed.')
    end

    input.unsubscriber = unsubscriber

    return Either.Right(input)
  end,
  removeSub = function(input)
    local msg = input.msg

    state.subs[input.unsubscriber] = nil
    state.subs_count = state.subs_count - 1

    return input
  end
}

local Relay = {
  validate = function(input)
    -- We may want to check here and make sure the relayer isn't itself?
    -- I'm sure there's other validations that can be made? 
    -- Maybe only subscribers can send messages?sub
    return Either.Right(input)
  end,
  getRelayedFor = function(input)
    local relayedForObj = findTagByName(input.msg.tags, "Forwarded-For");
    local relayedFor

    if relayedForObj and relayedForObj.value then
      -- forwardedFor exists and has a value
      relayedFor = relayedForObj.value
    else
      -- forwardedFor is nil or its value is nil
      relayedFor = input.msg.owner
    end

    -- Set relayedFor for the relayed message
    input.relayedFor = relayedFor

    return input
  end,
  createMessages = function(input)
    local relayedFor = input.relayedFor
    local relayedBy = input.env.process.id
    local messages = {}

    for key, value in pairs(state.subs) do
      table.insert(messages, {
        target = value,
        tags = {
          ['Relayed-For'] = relayedFor,
          ['Relayed-By'] = relayedBy
        },
        data = input.msg
      })
    end

    state.messages_count = state.messages_count + 1
    input.messages = messages

    return input
  end
}

local API = {
  sub = function(msg, env)
    return Either.of({
      msg = msg,
      env = env
    }).chain(Subscribe.validate).map(Subscribe.addSub).fold(FunkResponses.error, FunkResponses.success)
  end,
  unsub = function(msg, env)
    return Either.of({
      msg = msg,
      env = env
    }).chain(Unsubscribe.validate).map(Unsubscribe.removeSub).fold(FunkResponses.error, FunkResponses.success)
  end,
  relay = function(msg, env)
    return Either.of({
      msg = msg,
      env = env
    }).chain(Relay.validate).map(Relay.getRelayedFor).map(Relay.createMessages).fold(FunkResponses.error,
      FunkResponses.success)
  end,
  default = function(msg, env)
    local funk = findTagByName(msg.tags, "function").value
    return error({
      code = 404,
      message = 'Function not found: ' .. funk
    })
  end
}

function process.handle(msg, env)
  -- Initialize state if it's not already
  if state == nil then
    state = initState()
  end

  local funk
  local funkObj = findTagByName(msg.tags, "function");

  if funkObj and funkObj.value then
    -- funkObj exists and has a value
    funk = funkObj.value
  else
    -- forwardedFor is nil or its value is nil
    funk = nil
  end

  -- Throw an error if no function tag exists
  if funk == nil then
    return error({
      code = 500,
      message = 'no function tag in the message'
    })
  end

  -- Create function dictionary
  local FUNKS = {
    sub = 'sub',
    unsub = 'unsub',
    relay = 'relay'
  }

  -- Set function
  local funk = FUNKS[funk] or 'default'

  -- Run Function
  return API[funk](msg, env)
end

return process
