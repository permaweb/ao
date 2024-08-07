--[[
  This module implements the ao Standard Token Specification.

  Terms:
    Sender: the wallet or Process that sent the Message

  It will first initialize the internal state, and then attach handlers,
    according to the ao Standard Token Spec API:

    - Info(): return the token parameters, like Name, Ticker, Logo, and Denomination

    - Balance(Target?: string): return the token balance of the Target. If Target is not provided, the Sender
        is assumed to be the Target

    - Balances(): return the token balance of all participants

    - Transfer(Target: string, Quantity: number): if the Sender has a sufficient balance, send the specified Quantity
        to the Target. It will also issue a Credit-Notice to the Target and a Debit-Notice to the Sender

    - Mint(Quantity: number): if the Sender matches the Process Owner, then mint the desired Quantity of tokens, adding
        them the Processes' balance
]] --
local json = require('json')
local crypto = require(".crypto.init")

--[[
  Initialize State

  ao.id is equal to the Process.Id
]] --
if not Balances then Balances = { [ao.id] = 100000000000000 } end

if Name ~= 'Points Coin' then Name = 'Points Coin' end

if Ticker ~= 'Points' then Ticker = 'PNTS' end

if Denomination ~= 10 then Denomination = 10 end

if not Logo then Logo = 'SBCCXwwecBlDqRLUjb8dYABExTJXLieawf7m2aBJ-KY' end

--[[
  Add handlers for each incoming Action defined by the ao Standard Token Specification
]] --

--[[
  Info
]] --
handlers.add('info', handlers.utils.hasMatchingTag('Action', 'Info'), function(msg)
  ao.send(
      { Target = msg.From, Tags = { Name = Name, Ticker = Ticker, Logo = Logo, Denomination = tostring(Denomination) } })
end)

--[[
  Balance
]] --
handlers.add('balance', handlers.utils.hasMatchingTag('Action', 'Balance'), function(msg)
  local bal = '0'

  -- If not Target is provided, then return the Senders balance
  if (msg.Tags.Target and Balances[msg.Tags.Target]) then
    bal = tostring(Balances[msg.Tags.Target])
  elseif Balances[msg.From] then
    bal = tostring(Balances[msg.From])
  end

  ao.send({
    Target = msg.From,
    Tags = { Target = msg.From, Balance = bal, Ticker = Ticker, Action = 'Balance-Notice', Data = json.encode(tonumber(bal)) }
  })
end)

--[[
  Balances
]] --
handlers.add('balances', handlers.utils.hasMatchingTag('Action', 'Balances'),
             function(msg) ao.send({ Target = msg.From, Action = 'Balances-Notice', Data = json.encode(Balances) }) end)

--[[
  Transfer
]] --
handlers.add('transfer', handlers.utils.hasMatchingTag('Action', 'Transfer'), function(msg)
  assert(type(msg.Tags.Recipient) == 'string', 'Recipient is required!')
  assert(type(msg.Tags.Quantity) == 'string', 'Quantity is required!')
  assert(verifyEccAddress(msg.Tags.Recipient) == true, 'Ecc recipient must be EIP55')

  if not Balances[msg.From] then Balances[msg.From] = 0 end

  if not Balances[msg.Tags.Recipient] then Balances[msg.Tags.Recipient] = 0 end

  local qty = tonumber(msg.Tags.Quantity)
  assert(type(qty) == 'number', 'qty must be number')

  if Balances[msg.From] >= qty then
    Balances[msg.From] = Balances[msg.From] - qty
    Balances[msg.Tags.Recipient] = Balances[msg.Tags.Recipient] + qty

    --[[
      Only send the notifications to the Sender and Recipient
      if the Cast tag is not set on the Transfer message
    ]] --
    if not msg.Tags.Cast then
      -- Send Debit-Notice to the Sender
      ao.send({
        Target = msg.From,
        Tags = { Action = 'Debit-Notice', Recipient = msg.Tags.Recipient, Quantity = tostring(qty) }
      })
      -- Send Credit-Notice to the Recipient
      ao.send({
        Target = msg.Tags.Recipient,
        Tags = { Action = 'Credit-Notice', Sender = msg.From, Quantity = tostring(qty) }
      })
    end
  else
    ao.send({
      Target = msg.Tags.From,
      Tags = { Action = 'Transfer-Error', ['Message-Id'] = msg.Id, Error = 'Insufficient Balance!' }
    })
  end
end)

--[[
 Mint
]] --
handlers.add('mint', handlers.utils.hasMatchingTag('Action', 'Mint'), function(msg, env)
  assert(type(msg.Tags.Quantity) == 'string', 'Quantity is required!')

  if msg.From == env.Process.Id then
    -- Add tokens to the token pool, according to Quantity
    local qty = tonumber(msg.Tags.Quantity)
    Balances[env.Process.Id] = Balances[env.Process.Id] + qty
  else
    ao.send({
      Target = msg.Tags.From,
      Tags = {
        Action = 'Mint-Error',
        ['Message-Id'] = msg.Id,
        Error = 'Only the Process Owner can mint new ' .. Ticker .. ' tokens!'
      }
    })
  end
end)

function verifyEccAddress(address)
    if isEthereumAddress(address) then
    -- EIP-55
        local mixedAddress = toChecksumAddress(address)
        return mixedAddress == address
    end
        return true
end

function isEthereumAddress(address)
    if type(address) == "string" and address:sub(1, 2) == "0x" and #address == 42 then
        local isValid = true
        for i = 3, #address do
            local char = address:sub(i, i)
            if not string.match(char, "%x") then
                isValid = false
                break
            end
        end
        return isValid
    else
        return false
    end
end

function toChecksumAddress(address)
    address = string.lower(string.gsub(address, "^0x", ""))
    local hash = crypto.digest.keccak256(address):asHex()
    local ret = "0x"

    for i = 1, #address do
        local hashChar = tonumber(string.sub(hash, i, i), 16)
        if hashChar >= 8 then
            ret = ret .. string.upper(string.sub(address, i, i))
        else
            ret = ret .. string.sub(address, i, i)
        end
    end

    return ret
end
