local process = {
  _version = "0.0.1"
}

function process.handle(message, env)
  if not state then
    state = {}
  end

  if message.tags['function'] == "count" then
    state.counter = state.counter + 1
  end

  -- output = { owner = env.process.id, data = "increased counter", tags = { { name = "Content-Type", value = "text/plain" } },

  return {
    output = {
      owner = env.process.id,
      data = "increased counter",
      tags = {{
        name = "Content-Type",
        value = "text/plain"
      }}
    },
    messages = {},
    spawns = {}
  }
  -- return {
  --   messages = {},
  --   spawns = {}
  -- }
end

return process
