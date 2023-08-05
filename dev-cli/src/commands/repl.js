export async function repl() {
  const p = Deno.run({ cmd: ["docker", "run", "-v", ".:/src", "-it", "ysugimoto/webassembly-lua", "lua"]})
  await p.status()
}