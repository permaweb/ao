--[[ 
    Quest is an ao Process to track a list of tasks or "quests" that need to be 
    completed in the ao ecosystem. Anyone running aos can create a task in Quest
    and later mark it complete when they have verified its completeness in real
    life. Quest runs in aos and so uses the aos libraries.

    1. Everyone who particpates in Quest has aos.
    2. Via aos someone Sends a message to Quest offering some amount of points for a task.
    3. Then someone else looking for a task Sends a message to Quest saying list tasks.
    4. Once a task is complete, the person who created it can mark it as Concluded.
    5. Quests are unique by Name, if a user Sends a quest, only they can update it
    6. They can update it by Sending another Forge with the same name and new information
]] local pretty = require('.pretty')
local json = require("json")

-- the master table of quests
quests = quests or {}

requiredTags = {"Description", "Points", "Name"}
requiredTagsConclude = {"Name"}

-- mandatory input Tags
function checkRequired(tags, required)
    local missing = {}
    for _, field in ipairs(required) do
        if tags[field] == nil then table.insert(missing, field) end
    end

    return #missing == 0, missing
end

-- return -1 and the index if the Quest Name already exists
function nameExists(msg)
    for index, quest in ipairs(quests) do
        if Handlers.utils.hasMatchingTag("Name", msg.Tags.Name)(quest) == -1 then
            return -1, index
        end
    end
end

listForUser = listForUser or {}

--[[
  Generate List
]]
function generateList()
    listForUser = {}
    for index, quest in ipairs(quests) do
        table.insert(listForUser, {
            From = quest.From,
            Url = quest.Tags.Url,
            Name = quest.Tags.Name,
            Description = quest.Tags.Description,
            Points = quest.Tags.Points,
            Concluded = quest.Concluded
        })
    end
end

--[[
  Creates formatted list for quests
]]
function printlist(list)
    local output = ""
    -- Find all the keys from the first item for column headers
    local headers = {"QuestId", "Name", "Points"}

    -- Calculate the width for each column
    local colWidths = {}
    for _, header in ipairs(headers) do
        local maxWidth = #header
        for _, item in ipairs(list) do
            local itemLen = #tostring(item[header])
            if itemLen > maxWidth then maxWidth = itemLen end
        end
        colWidths[header] = maxWidth
    end

    -- Print header row
    for _, header in ipairs(headers) do
        output = output ..
                     string.format("%-" .. colWidths[header] .. "s ", header)

    end
    output = output .. "\n"

    -- Print a separator
    for _, header in ipairs(headers) do
        output = output .. string.rep("-", colWidths[header]) .. " "
    end
    output = output .. "\n"

    -- Print each row
    for i, item in ipairs(list) do
        for _, header in ipairs(headers) do
            if header == "QuestId" then
                output = output ..
                             string.format("%-" .. colWidths[header] .. "s ",
                                           tostring(i))
            else
                output = output ..
                             string.format("%-" .. colWidths[header] .. "s ",
                                           tostring(item[header]))
            end
        end
        output = output .. "\n"
    end
    return output
end

--[[ 
    Main Forge handler allows an aos instance to Forge and
    update that Forge if the request is from the same Owner.

    Send({ Target = "obV9iL-w_K7DOMAV-Ze7dpgdJS3usxXdqz3mZ4Mn_zk", Tags = { Action = "Forge", Name = "Example Quest", Description = "Create a Quest", Url = "link to your site", Points = "500"}})

    -- only accept quests from process for now.
]]
Handlers.add("Forge", function(msg)
    return msg.Action == "Forge" and msg.From == ao.env.Process.Id
end, function(msg)
    local allPresent, missingFields = checkRequired(msg.Tags, requiredTags)
    local existingName, existingIndex = nameExists(msg)
    if allPresent then
        if existingName == -1 then
            local existingQuest = quests[existingIndex]
            if existingQuest.From == msg.From then
                quests[existingIndex] = msg
                Handlers.utils.reply("Quest updated!")(msg)
            else
                Handlers.utils.reply("Failed to forge, Name already exists...")(
                    msg)
            end
        else
            -- Just store the whole msg because we don't know what we will need later
            msg.Concluded = "false"
            table.insert(quests, msg)
            -- Reply letting them know they have forged
            Handlers.utils.reply("Quest forged!")(msg)
        end
    else
        local missingFieldsStr = table.concat(missingFields, ", ")
        Handlers.utils
            .reply("Forge failed, required Tags: " .. missingFieldsStr)(msg)
    end
end)

Handlers.add("Details", Handlers.utils.hasMatchingTag("Action", "Detail"),
             function(msg)
    local item = quests[tonumber(msg.Index)]
    local output = "Points: " .. item.Points .. "\n" .. "Name: " .. item.Name ..
                       "\n" .. "Description: " .. item.Description .. "\n" ..
                       "From: " .. item.From .. "\n" .. "Url" .. item.Url ..
                       "\n"
    ao.send({Target = msg.From, Data = output})
    print(output)
end)

Handlers.add("List", Handlers.utils.hasMatchingTag("Action", "List"),
             function(msg)
    generateList()
    if Handlers.utils.hasMatchingTag("Format", "json")(msg) == -1 then
        Handlers.utils.reply(json.encode(listForUser))(msg)
    else
        Handlers.utils.reply(printlist(listForUser))(msg)
    end
end)

-- Send({ Target = "obV9iL-w_K7DOMAV-Ze7dpgdJS3usxXdqz3mZ4Mn_zk", Tags = { Action = "Conclude", Name = "Example Quest" }})
Handlers.add("Conclude", Handlers.utils.hasMatchingTag("Action", "Conclude"),
             function(msg)
    local allPresent, missingFields = checkRequired(msg.Tags,
                                                    requiredTagsConclude)
    local existingName, existingIndex = nameExists(msg)
    if allPresent then
        if existingName == -1 then
            local existingQuest = quests[existingIndex]
            if existingQuest.From == msg.From then
                quests[existingIndex].Concluded = "true"
                Handlers.utils.reply("Quest concluded!")(msg)
            else
                Handlers.utils.reply(
                    "Failed to conclude, you are not the creator of this quest.")(
                    msg)
            end
        else
            Handlers.utils.reply("Failed to conclude, Name does not exist")(msg)
        end
    else
        local missingFieldsStr = table.concat(missingFields, ", ")
        Handlers.utils.reply("Failed to conclude, required Tags: " ..
                                 missingFieldsStr)(msg)
    end
end)


