
--[[ 
    Quest is an ao Process to track a list of tasks or "quests" that need to be 
    completed in the ao ecosystem. Anyone running aos can create a task in Quest
    and later mark it complete when they have verified its completeness in real
    life. Quest runs in aos and so uses the aos libraries.

    1. Everyone who particpates in Quest has aos.
    2. Via aos someone sends a message to Quest offering some amount of points for a task.
    3. Then someone else looking for a task sends a message to Quest saying list tasks.
    4. Once a task is complete, the person who created it can mark it as Concluded.
    5. Quests are unique by Name, if a user sends a quest, only they can update it
    6. They can update it by sending another Forge with the same name and new information
]]

local pretty = require('.pretty')

-- the master table of quests
quests = quests or {}

requiredTags = { "Description", "Points", "Name" }
requiredTagsConclude = { "Name" }

-- mandatory input Tags
function checkRequired(tags, required)
    local missing = {}
    for _, field in ipairs(required) do
        if tags[field] == nil then
            table.insert(missing, field)
        end
    end

    return #missing == 0, missing
end

-- return -1 and the index if the Quest Name already exists
function nameExists(msg)
    for index, quest in ipairs(quests) do
        if handlers.utils.hasMatchingTag("Name", msg.Tags.Name)(quest) == -1 then
            return -1, index
        end
    end
end

--[[ 
    Build a JSON string out of a table, is simplified to the quests
    table and probably wouldnt work on more complex tables
]]
function toJson(tbl)
    local function serialize(tbl)
        local jsonList = {}

        for _, subTbl in ipairs(tbl) do
            local elements = {}
            for k, v in pairs(subTbl) do
                table.insert(elements, string.format("\"%s\":\"%s\"", k, v))
            end
            table.insert(jsonList, "{" .. table.concat(elements, ",") .. "}")
        end

        return "[" .. table.concat(jsonList, ",") .. "]"
    end

    return serialize(tbl)
end

--[[ 
    Main Forge handler allows an aos instance to Forge and
    update that Forge if the request is from the same Owner.

    send({ Target = "zcJqWTw7e1WPwXC_OAtU0CE5VWUNcIAHvtx1aGN7do8", Tags = { Action = "Forge", Description = "Create a Package Manager", Url = "...", Points = "500"}})
]]
handlers.add(
  "Forge", 
  handlers.utils.hasMatchingTag("Action", "Forge"),
  function (msg) 
    local allPresent, missingFields = checkRequired(msg.Tags, requiredTags)
    local existingName, existingIndex = nameExists(msg)
    if allPresent then
        if existingName == -1 then
            local existingQuest = quests[existingIndex]
            if existingQuest.From == msg.From then
                quests[existingIndex] = msg
                handlers.utils.reply("Quest updated!")(msg)
            else
                handlers.utils.reply("Failed to forge, Name already exists...")(msg)
            end
        else
            -- Just store the whole msg because we don't know what we will need later
            msg.Concluded = "false"
            table.insert(quests, msg)
            -- Reply letting them know they have forged
            handlers.utils.reply("Quest forged!")(msg)
        end
    else
        local missingFieldsStr = table.concat(missingFields, ", ")
        handlers.utils.reply("Forge failed, required Tags: " .. missingFieldsStr)(msg)
    end
  end
)

-- send({ Target = "zcJqWTw7e1WPwXC_OAtU0CE5VWUNcIAHvtx1aGN7do8", Tags = { Action = "List" }})
handlers.add(
  "List", 
  handlers.utils.hasMatchingTag("Action", "List"),
  function (msg) 
    listForUser = {}
    for index, quest in ipairs(quests) do
        table.insert(listForUser, {
            From = quest.Owner,
            Url = quest.Tags.Url,
            Name = quest.Tags.Name,
            Description = quest.Tags.Description,
            Points = quest.Tags.Points,
            Concluded = quest.Concluded
        })  
    end
    if handlers.utils.hasMatchingTag("Format", "json")(msg) == -1 then
        handlers.utils.reply(toJson(listForUser))(msg)
    else 
        handlers.utils.reply(pretty.tprint(listForUser))(msg)
    end
  end
)

-- send({ Target = "zcJqWTw7e1WPwXC_OAtU0CE5VWUNcIAHvtx1aGN7do8", Tags = { Action = "Conclude", Name = "quest name" }})
handlers.add(
  "Conclude", 
  handlers.utils.hasMatchingTag("Action", "Conclude"),
  function (msg) 
    local allPresent, missingFields = checkRequired(msg.Tags, requiredTagsConclude)
    local existingName, existingIndex = nameExists(msg)
    if allPresent then
        if existingName == -1 then
            local existingQuest = quests[existingIndex]
            if existingQuest.From == msg.From then
                quests[existingIndex].Concluded = "true"
                handlers.utils.reply("Quest concluded!")(msg)
            else
                handlers.utils.reply("Failed to conclude, you are not the creator of this quest.")(msg)
            end
        else
            handlers.utils.reply("Failed to conclude, Name does not exist")(msg)
        end
    else
        local missingFieldsStr = table.concat(missingFields, ", ")
        handlers.utils.reply("Failed to conclude, required Tags: " .. missingFieldsStr)(msg)
    end
  end
)

