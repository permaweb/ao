/* global Deno */

import { Command, resolve, copy } from '../deps.js'

const STARTERS = resolve(Deno.env.get('AO_INSTALL') + '/starters')
const C = resolve(STARTERS + '/c')
const LUA = resolve(STARTERS + '/lua')

export async function init ({ lang = 'lua' }, name) {
  // const config = {
  //   name,
  //   entry: 'src/main.lua',
  //   output: `${name}.lua`
  // }
  Deno.mkdir(`./${name}`, { recursive: true })
  const dir = (lang === 'c') ? C : LUA
  return await copy(dir, `./${name}`, { overwrite: true })
}

export const command = new Command()
  .description('Create an ao Process Source Project')
  .usage('-l cpp <my-project-name>')
  .option(
    '-l, --lang <language:string>',
    'The starter to use. Defaults to Lua. Options are "lua" and "c"'
  )
  .arguments('<name:string>')
  .action(init)
