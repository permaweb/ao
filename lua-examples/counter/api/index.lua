local incrementer = require('increment')
local decrementer = require('decrement')

API = {}

API.increment = incrementer.increment;
API.decrement = decrementer.decrement;

return API;