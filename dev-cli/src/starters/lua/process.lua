local process = { _version = "0.0.1" }
ao = require('.ao')

function process.handle(msg, env) 

  if (msg.Data == "ping") then
    ao.send({ Target = msg.From, Data = "pong" })
  end
  
  return ao.result({
    Output = 'sent pong reply'
  })

end

return process