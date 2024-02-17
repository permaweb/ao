local process = {_version = "0.0.1"}

function process.handle(msg, ao)
    local result = Extensions.Log("Hello from lua")
    return {Output = "Testing"}
end

return process
