local process = {_version = "0.0.1"}

Count = 0

function process.handle(msg, ao)
    local action = ""
    for _, o in ipairs(msg.Tags) do
        if o.name == "Action" then action = o.value end
    end
    if action == "echo" then return {Output = msg.Data} end
    if action == "inc" then
        Count = Count + 1
        return {Output = Count}
    end
end

return process
