-- load the luaunit module
local luaunit = require('luaunit')
local contract = require('contract');

-- Define the test class
Test = {}

-- Define a test case
function Test:test_sum()
    luaunit.assertEquals(contract.sum(5), 10)  -- Check if add(2, 3) equals 5
end

-- Run the test
luaunit.run()
