local ao = { _version = "0.0.1" }

function ao.send(input, target, AO) 
  local message = {
    target = target,
    tags = {
      { name = "Data-Protocol", value = "ao" },
      { name = "ao-type", value = "message" },
      { name = "Forwarded-For", value = AO.process.id }
    }
  }
  
  for k,v in pairs(input) do
    table.insert(message.tags, { name = k, value = v })
  end

  return message
end

function ao.spawn(data, tags, AO) 
  local spawn = {
    data = data,
    tags = {
      { name = "Data-Protocol", value = "ao" },
      { name = "ao-type", value = "process" },
      { name = "Forwarded-For", value = AO.process.id }
    }
  }

  for k,v in pairs(tags) do
    table.insert(spawn.tags, { name = k, value = v })
  end

  return spawn
end

return ao
