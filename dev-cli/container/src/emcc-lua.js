import { Box } from './lib/box.js'

const CONFIG = 'config.json'
const CWD = Deno.cwd()
const readFileSync = Deno.readFileSync
const run = async cmd => {
  const p = Deno.run({cmd})
  await p.status()
}

async function main() {
  let lua_files = []
  let library_files = []
  let dependency_libraries = []

  let definition = getDefinition().extract()
  let entry = definition.entry

  await installDependencies(`${CWD}/modules`, definition.dependencies)
  
  // bundle into single file
  await run(['lua', '/opt/pack.lua', `/src`, '>', `out.lua`])
  
}

main()

async function installDependencies(target, deps) {
  return Promise.all(deps.map(d => 
    run(['luarocks', `--tree=${target}`, '--deps-mode=one', 'install', d])  
  ))
}

function getDefinition() {
  return Box.of(`${CWD}/${CONFIG}`)
    .map(readFileSync)
    .map(bytes => new TextDecoder("utf-8").decode(bytes))
    .map(JSON.parse)
}