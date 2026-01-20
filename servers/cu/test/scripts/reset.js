import { readFileSync } from "node:fs";

import { connect, createDataItemSigner } from "@permaweb/aoconnect";

const { message } = connect({ MU_URL: process.env.MU_URL })

const wallet = JSON.parse(
  readFileSync(process.env.AOS_WALLET).toString(),
);

await message({
  process: process.env.PID,
  tags: [
    { name: "Action", value: "Reset-Memory" },
  ],
  signer: createDataItemSigner(wallet),
})
  .then(console.log)
  .catch(console.error);

await message({
  process: process.env.PID,
  tags: [
    { name: "Action", value: "Eval" },
  ],
  data: "require('.process')._version",
  signer: createDataItemSigner(wallet),
})
  .then(console.log)
  .catch(console.error);

await message({
  process: process.env.PID,
  tags: [
    { name: "Action", value: "Eval" },
  ],
  data: "ao.authorities = { 'jnbRhoH3JGTdRz0Y9X-gh-eosrbIpdxs58DPTtlOVE8' }",
  signer: createDataItemSigner(wallet),
})
  .then(console.log)
  .catch(console.error);

await message({
  process: process.env.PID,
  tags: [
    { name: "Action", value: "Eval" },
  ],
  data: `
local bint = require('.bint')(256)
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
]]
--
local json = require('json')

--[[
  utils helper functions to remove the bint complexity.
]]
--


local utils = {
  add = function(a, b)
    return tostring(bint(a) + bint(b))
  end,
  subtract = function(a, b)
    return tostring(bint(a) - bint(b))
  end,
  toBalanceValue = function(a)
    return tostring(bint(a))
  end,
  toNumber = function(a)
    return bint.tonumber(a)
  end
}


--[[
     Initialize State

     ao.id is equal to the Process.Id
   ]]
--
Variant = "0.0.3"

-- token should be idempotent and not change previous state updates
Denomination = Denomination or 12
Balances = Balances or { [ao.id] = utils.toBalanceValue(10000 * 10 ^ Denomination) }
TotalSupply = TotalSupply or utils.toBalanceValue(10000 * 10 ^ Denomination)
Name = Name or 'Points Coin'
Ticker = Ticker or 'PNTS'
Logo = Logo or 'SBCCXwwecBlDqRLUjb8dYABExTJXLieawf7m2aBJ-KY'

--[[
     Add handlers for each incoming Action defined by the ao Standard Token Specification
   ]]
--

--[[
     Info
   ]]
--
Handlers.add('info', Handlers.utils.hasMatchingTag("Action", "Info"), function(msg)
  if msg.reply then
    msg.reply({
      name = Name,
      ticker = Ticker,
      logo = Logo,
      denomination = tostring(Denomination),
      supply = TotalSupply
    })
  else
    Send({Target = msg.From, 
      name = Name,
      ticker = Ticker,
      logo = Logo,
      denomination = tostring(Denomination),
      supply = TotalSupply
   })
  end
end)

--[[
     Balance
   ]]
--
Handlers.add('balance', Handlers.utils.hasMatchingTag("Action", "Balance"), function(msg)
  local bal = '0'

  -- If not Recipient is provided, then return the Senders balance
  if (msg.Tags.Recipient) then
    if (Balances[msg.Tags.Recipient]) then
      bal = Balances[msg.Tags.Recipient]
    end
  elseif msg.Tags.Target and Balances[msg.Tags.Target] then
    bal = Balances[msg.Tags.Target]
  elseif Balances[msg.From] then
    bal = Balances[msg.From]
  end
  if msg.reply then
    msg.reply({
      Balance = bal,
      Ticker = Ticker,
      Account = msg.Tags.Recipient or msg.From,
      Data = bal
    })
  else
    Send({
      Target = msg.From,
      Balance = bal,
      Ticker = Ticker,
      Account = msg.Tags.Recipient or msg.From,
      Data = bal
    })
  end
end)

--[[
     Balances
   ]]
--
Handlers.add('balances', Handlers.utils.hasMatchingTag("Action", "Balances"),
  function(msg) 
    if msg.reply then
      msg.reply({ Data = json.encode(Balances) })
    else 
      Send({Target = msg.From, Data = json.encode(Balances) }) 
    end
  end)

--[[
     Transfer
   ]]
--
Handlers.add('transfer', Handlers.utils.hasMatchingTag("Action", "Transfer"), function(msg)
  assert(type(msg.Recipient) == 'string', 'Recipient is required!')
  assert(type(msg.Quantity) == 'string', 'Quantity is required!')
  assert(bint.__lt(0, bint(msg.Quantity)), 'Quantity must be greater than 0')

  if not Balances[msg.From] then Balances[msg.From] = "0" end
  if not Balances[msg.Recipient] then Balances[msg.Recipient] = "0" end

  if bint(msg.Quantity) <= bint(Balances[msg.From]) then
    Balances[msg.From] = utils.subtract(Balances[msg.From], msg.Quantity)
    Balances[msg.Recipient] = utils.add(Balances[msg.Recipient], msg.Quantity)

    --[[
         Only send the notifications to the Sender and Recipient
         if the Cast tag is not set on the Transfer message
       ]]
    --
    if not msg.Cast then
      -- Debit-Notice message template, that is sent to the Sender of the transfer
      local debitNotice = {
        Action = 'Debit-Notice',
        Recipient = msg.Recipient,
        Quantity = msg.Quantity,
        Data = Colors.gray ..
            "You transferred " ..
            Colors.blue .. msg.Quantity .. Colors.gray .. " to " .. Colors.green .. msg.Recipient .. Colors.reset
      }
      -- Credit-Notice message template, that is sent to the Recipient of the transfer
      local creditNotice = {
        Target = msg.Recipient,
        Action = 'Credit-Notice',
        Sender = msg.From,
        Quantity = msg.Quantity,
        Data = Colors.gray ..
            "You received " ..
            Colors.blue .. msg.Quantity .. Colors.gray .. " from " .. Colors.green .. msg.From .. Colors.reset
      }

      -- Add forwarded tags to the credit and debit notice messages
      for tagName, tagValue in pairs(msg) do
        -- Tags beginning with "X-" are forwarded
        if string.sub(tagName, 1, 2) == "X-" then
          debitNotice[tagName] = tagValue
          creditNotice[tagName] = tagValue
        end
      end

      -- Send Debit-Notice and Credit-Notice
      if msg.reply then
        msg.reply(debitNotice)
      else
        debitNotice.Target = msg.From
        Send(debitNotice)
      end
      Send(creditNotice)
    end
    -- update process base state
    local patchMsg = { 
      device = "patch@1.0",
      balances = {},
      ['token-info'] = {
        name = Name,
        ticker = Ticker,
        logo = Logo,
        denomination = tostring(Denomination),
        supply = TotalSupply
    }}
    patchMsg.balances[msg.Recipient] = Balances[msg.Recipient]
    patchMsg.balances[msg.From] = Balances[msg.From]
    Send(patchMsg)

  else
    if msg.reply then
      msg.reply({
        Action = 'Transfer-Error',
        ['Message-Id'] = msg.Id,
        Error = 'Insufficient Balance!'
      })
    else
      Send({
        Target = msg.From,
        Action = 'Transfer-Error',
        ['Message-Id'] = msg.Id,
        Error = 'Insufficient Balance!'
      })
    end
  end
end)

--[[
    Mint
   ]]
--
Handlers.add('mint', Handlers.utils.hasMatchingTag("Action","Mint"), function(msg)
  assert(type(msg.Quantity) == 'string', 'Quantity is required!')
  assert(bint(0) < bint(msg.Quantity), 'Quantity must be greater than zero!')

  if not Balances[ao.id] then Balances[ao.id] = "0" end

  if msg.From == ao.id then
    -- Add tokens to the token pool, according to Quantity
    Balances[msg.From] = utils.add(Balances[msg.From], msg.Quantity)
    TotalSupply = utils.add(TotalSupply, msg.Quantity)
    if msg.reply then
      msg.reply({
        Data = Colors.gray .. "Successfully minted " .. Colors.blue .. msg.Quantity .. Colors.reset
      })
    else
      Send({
        Target = msg.From,
        Data = Colors.gray .. "Successfully minted " .. Colors.blue .. msg.Quantity .. Colors.reset
      })
    end
    -- update process base state
    local patchMsg = { 
      device = "patch@1.0",
      balances = {},
      ['token-info'] = {
        name = Name,
        ticker = Ticker,
        logo = Logo,
        denomination = tostring(Denomination),
        supply = TotalSupply
    }}
    patchMsg.balances[msg.From] = Balances[msg.From]
    Send(patchMsg)
  else
    if msg.reply then
      msg.reply({
        Action = 'Mint-Error',
        ['Message-Id'] = msg.Id,
        Error = 'Only the Process Id can mint new ' .. Ticker .. ' tokens!'
      })
    else
      Send({
        Target = msg.From,
        Action = 'Mint-Error',
        ['Message-Id'] = msg.Id,
        Error = 'Only the Process Id can mint new ' .. Ticker .. ' tokens!'
      })
    end
  end
end)

--[[
     Total Supply
   ]]
--
Handlers.add('totalSupply', Handlers.utils.hasMatchingTag("Action","Total-Supply"), function(msg)
  assert(msg.From ~= ao.id, 'Cannot call Total-Supply from the same process!')
  if msg.reply then
    msg.reply({
      Action = 'Total-Supply',
      Data = TotalSupply,
      Ticker = Ticker
    })
  else
    Send({
      Target = msg.From,
      Action = 'Total-Supply',
      Data = TotalSupply,
      Ticker = Ticker
    })
  end
end)


--[[
 Burn
]] --
Handlers.add('burn', Handlers.utils.hasMatchingTag("Action",'Burn'), function(msg)
  print('not implemented')
end)
  `,
  signer: createDataItemSigner(wallet),
})
  .then(console.log)
  .catch(console.error);

