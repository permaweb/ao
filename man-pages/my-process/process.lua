
local process = { _version = "0.0.1" }

function process.handle(msg, env) 
  -- do stuff
  local response = {
    output = "Hello World",
    messages = {},
    spawns = {}
  }
  return response
end

return process
