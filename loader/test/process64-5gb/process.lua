
local process = {_version = "0.0.1"}

local Table = {}

function process.handle (msg, ao)

  if msg.Action == 'Insert-Into-Table' then
    local times = tonumber(msg.Times or '1')
    for i=1, times, 1 do
      local str = '_'..tostring(i)..'_'..msg.Data
      table.insert(Table, str)
    end
    return { Output = 'Done.' }
  end

  if msg.Action == 'Get-Table-Length' then
    return {
      Output = #Table
    }
  end

  return { Output = 'Hello, world!' }
end

return process
