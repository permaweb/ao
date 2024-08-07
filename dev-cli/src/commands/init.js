/* global Deno */

import { Command } from '../deps.js'
import * as path from 'https://deno.land/std@0.138.0/path/mod.ts'
import { copy } from 'https://deno.land/std@0.224.0/fs/copy.ts'

const STARTERS = path.resolve(Deno.env.get("AO_INSTALL") + '/starters')
const C = path.resolve(STARTERS + '/c')
const LUA = path.resolve(STARTERS + '/lua')

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
    'The starter to use. Defaults to Lua. Options are "lua" and "cpp"'
  )
  .arguments('<name:string>')
  .action(init)
