local json = require "json"
local process = require ".process"
ao = require "ao"

function handle(msgJSON, aoJSON)
    -- decode inputs
    local msg = json.decode(msgJSON)
    local env = json.decode(aoJSON)
    ao.init(env)
    -- relocate custom tags to root message
    msg = ao.normalize(msg)
    -- handle process
    --
    -- The process may throw an error, either intentionally or unintentionally
    -- So we need to be able to catch these unhandled errors and bubble them
    -- across the interop with some indication that it was unhandled
    --
    -- To do this, we wrap the process.handle with pcall(), and return both the status
    -- and response as JSON. The caller can examine the status boolean and decide how to
    -- handle the error
    --
    -- See pcall https://www.lua.org/pil/8.4.html
    local status, response = pcall(function()
        return (process.handle(msg, ao))
    end)

    -- encode output
    local responseJSON = json.encode({ok = status, response = response})
    return responseJSON
end
