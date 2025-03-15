local json = require "json"

function handle(msgJSON, aoJSON)
    -- by requiring '.process' here we are able to reload via .updates
    local process = require ".process"
    -- decode inputs
    local msg = json.decode(msgJSON)
    local env = json.decode(aoJSON)

    -- handle process
    local status, response = pcall(function()
        return (process.handle(msg, env))
    end)

    -- encode output
    local responseJSON = json.encode({ok = status, response = response})
    -- free 
    response = nil
    collectgarbage()
    return responseJSON
end
