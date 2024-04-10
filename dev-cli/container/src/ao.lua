local ao = {
    _version = "0.0.4",
    id = "",
    _module = "",
    authorities = {},
    _ref = 0,
    outbox = {Output = {}, Messages = {}, Spawns = {}, Assignments = {}}
}

local function _includes(list)
    return function(key)
        local exists = false
        for _, listKey in ipairs(list) do
            if key == listKey then
                exists = true
                break
            end
        end
        if not exists then return false end
        return true
    end
end

local function isArray(table)
    if type(table) == "table" then
        local maxIndex = 0
        for k, v in pairs(table) do
            if type(k) ~= "number" or k < 1 or math.floor(k) ~= k then
                return false -- If there's a non-integer key, it's not an array
            end
            maxIndex = math.max(maxIndex, k)
        end
        -- If the highest numeric index is equal to the number of elements, it's an array
        return maxIndex == #table
    end
    return false
end

local function padZero32(num) return string.format("%032d", num) end

function ao.normalize(msg)
    for _, o in ipairs(msg.Tags) do
        if not _includes({
            'Data-Protocol', 'Variant', 'From-Process', 'From-Module', 'Type',
            'Ref_', 'From', 'Owner', 'Anchor', 'Target', 'Data', 'Tags'
        })(o.name) then msg[o.name] = o.value end
    end
    return msg
end

function ao.init(env)
    if ao.id == "" then ao.id = env.Process.Id end

    if ao._module == "" then
        for _, o in ipairs(env.Process.Tags) do
            if o.name == "Module" then ao._module = o.value end
        end
    end

    if #ao.authorities < 1 then
        for _, o in ipairs(env.Process.Tags) do
            if o.name == "Authority" then
                table.insert(ao.authorities, o.value)
            end
        end
    end

    ao.outbox = {Output = {}, Messages = {}, Spawns = {}, Assignments = {}}
    ao.env = env

end

function ao.log(txt)
    if type(ao.outbox.Output) == 'string' then
        ao.outbox.Output = {ao.outbox.Output}
    end
    table.insert(ao.outbox.Output, txt)
end

-- clears outbox
function ao.clearOutbox() ao.outbox = {Output = {}, Messages = {}, Spawns = {}, Assignments = {}} end

function ao.send(msg)
    assert(type(msg) == 'table', 'msg should be a table')
    ao._ref = ao._ref + 1

    local message = {
        Target = msg.Target,
        Data = msg.Data,
        Anchor = padZero32(ao._ref),
        Tags = {
            {name = "Data-Protocol", value = "ao"},
            {name = "Variant", value = "ao.TN.1"},
            {name = "Type", value = "Message"},
            {name = "From-Process", value = ao.id},
            {name = "From-Module", value = ao._module},
            {name = "Ref_", value = tostring(ao._ref)}
        }
    }

    -- if custom tags in root move them to tags
    for k, v in pairs(msg) do
        if not _includes({"Target", "Data", "Anchor", "Tags", "From"})(k) then
            table.insert(message.Tags, {name = k, value = v})
        end
    end

    if msg.Tags then
        if isArray(msg.Tags) then
            for _, o in ipairs(msg.Tags) do
                table.insert(message.Tags, o)
            end
        else
            for k, v in pairs(msg.Tags) do
                table.insert(message.Tags, {name = k, value = v})
            end
        end
    end

    -- add message to outbox
    table.insert(ao.outbox.Messages, message)

    return message
end

function ao.spawn(module, msg)
    assert(type(module) == "string", "module source id is required!")
    assert(type(msg) == 'table', 'msg should be a table')
    -- inc spawn reference
    ao._ref = ao._ref + 1

    local spawn = {
        Data = msg.Data or "NODATA",
        Anchor = padZero32(ao._ref),
        Tags = {
            {name = "Data-Protocol", value = "ao"},
            {name = "Variant", value = "ao.TN.1"},
            {name = "Type", value = "Process"},
            {name = "From-Process", value = ao.id},
            {name = "From-Module", value = ao._module},
            {name = "Module", value = module},
            {name = "Ref_", value = tostring(ao._ref)}
        }
    }

    -- if custom tags in root move them to tags
    for k, v in pairs(msg) do
        if not _includes({"Target", "Data", "Anchor", "Tags", "From"})(k) then
            table.insert(spawn.Tags, {name = k, value = v})
        end
    end

    if msg.Tags then
        if isArray(msg.Tags) then
            for _, o in ipairs(msg.Tags) do
                table.insert(spawn.Tags, o)
            end
        else
            for k, v in pairs(msg.Tags) do
                table.insert(spawn.Tags, {name = k, value = v})
            end
        end
    end

    -- add spawn to outbox
    table.insert(ao.outbox.Spawns, spawn)

    return spawn
end

function ao.assign(assignment)
    assert(type(assignment) == 'table', 'assignment should be a table')
    assert(type(assignment.Processes) == 'table', 'Processes should be a table')
    assert(type(assignment.Message) == "string", "Message should be a string")
    table.insert(ao.outbox.Assignments, assignment)
end

function ao.isTrusted(msg)
    if #ao.authorities == 0 then return true end

    for _, authority in ipairs(ao.authorities) do
        if msg.From == authority then return true end
        if msg.Owner == authority then return true end
    end
    return false
end

function ao.result(result)
    -- if error then only send the Error to CU
    if ao.outbox.Error or result.Error then
        return {Error = result.Error or ao.outbox.Error}
    end
    return {
        Output = result.Output or ao.outbox.Output,
        Messages = ao.outbox.Messages,
        Spawns = ao.outbox.Spawns,
        Assignments = ao.outbox.Assignments
    }
end

return ao
