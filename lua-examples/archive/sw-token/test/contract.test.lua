-- load the luaunit module
local luaunit = require('luaunit')
local contract = require('contract');

-- Define the test class
Test = {}

-- Define a test case
function Test:test_noFunk()
  local state = {
    balances = {
      x = 10,
      y = 5
    }
  }

  local action = {
    caller = "x",
    input = {
      target = "y",
      qty = 3
    }
  }

  local output = contract.handle(state, action, {})
  luaunit.assertEquals(output.result.error, "No function supplied or function not recognized. undefined") -- Check if add(2, 3) equals 5
end

function Test:test_wrongFunk()
  local state = {
    balances = {
      x = 10,
      y = 5
    }
  }

  local action = {
    caller = "x",
    input = {
      target = "y",
      qty = 3
    }
  }

  action.input['function'] = 'not-recognized'

  local output = contract.handle(state, action, {})
  luaunit.assertEquals(output.result.error, "No function supplied or function not recognized. not-recognized")
end

function Test:test_transfer()
  local state = {
    balances = {
      x = 10,
      y = 5
    }
  }

  local action = {
    caller = "x",
    input = {
      target = "y",
      qty = 3
    }
  }

  -- Set the function after cause lua doesnt like the word "function".
  action.input['function'] = 'transfer';

  local output = contract.handle(state, action, {})
  luaunit.assertEquals(output.state.balances.x, 7) -- Check if add(2, 3) equals 5
  luaunit.assertEquals(output.state.balances.y, 8) -- Check if add(2, 3) equals 5
end

-- Run the test
luaunit.run()
