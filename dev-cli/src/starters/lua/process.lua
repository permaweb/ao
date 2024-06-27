local process = { _version = "0.0.1" }

function process.handle(msg, ao) 
  assert(ao.isTrusted(msg), 'ao Message is not trusted')
  
  if (msg.Data == "ping") then
    ao.send({ Target = msg.From, Data = "pong" })
  end
  
  return ao.result({
    Output = 'sent pong reply'
  })

end

return process