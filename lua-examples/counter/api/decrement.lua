local either = require('common.either')

local function isOne(value)
    if value == 1 then 
        return either.Right(value) 
    else
        return either.Left(value)  -- Added an else branch to handle cases where value is not 1
    end
end

local Main = {}

function Main.decrement(state, action, SmartWeave)
    print("decrement")
    either.of(1).chain(isOne).fold()
    local response = {
        state = state,
        result = { messages = {} }
    }
    return response
end

return Main
