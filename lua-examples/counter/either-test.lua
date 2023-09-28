local Either = require('common.either')

local function error()
    print('error')
end

local function success(input)
    print(input)
    print("success")
end

local function plusOne(input)
    print(input)
    return input + 1
end

local function minusOne(input)
    print(input)
    return input - 1
end

local function timesTen(input)
    print(input)
    return input * 10
end

local function isOne(input)
    if input == 1 then
        return Either.Right(input)
    else
        return Either.Left(input)
    end
end

local function main(input)
    Either.of(input).chain(isOne).map(plusOne).map(minusOne).map(timesTen).fold(error, success)
end

main(1)
main(2)
