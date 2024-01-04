/* global Deno */

import { Command } from '../deps.js'

const LUA = `
local process = { _version = "0.0.1" }

function process.handle(msg, ao) 
  assert(ao.isTrusted(msg), 'ao Message is not trusted')
  
  if (msg.Data == "ping") then
    ao.send({ Target = msg.From, Data = "pong" })
  end
  
  return ao.result({
    Output = 'sent pong reply'
  })

end

return process
`

export function init (_, name) {
  // const config = {
  //   name,
  //   entry: 'src/main.lua',
  //   output: `${name}.lua`
  // }
  return Deno.mkdir(`./${name}`, { recursive: true })
    .then((_) => Deno.writeTextFile(`./${name}/process.lua`, LUA))
}

export const command = new Command()
  .description('Create an ao Process Source Project')
  .arguments('<name:string>')
  .action(init)
