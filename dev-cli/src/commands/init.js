/* global Deno */

import { Command } from '../deps.js'
import * as path from 'https://deno.land/std@0.138.0/path/mod.ts'
import { copy } from 'https://deno.land/std@0.224.0/fs/copy.ts'

const STARTERS = path.resolve(path.dirname(path.fromFileUrl(import.meta.url)) + '/../starters')
const CPP = path.resolve(STARTERS + '/cpp')
const LUA = path.resolve(STARTERS + '/lua')

export async function init ({ lang = 'lua' }, name) {
  // const config = {
  //   name,
  //   entry: 'src/main.lua',
  //   output: `${name}.lua`
  // }
  Deno.mkdir(`./${name}`, { recursive: true })
  const dir = (lang === 'cpp') ? CPP : LUA
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
