export async function repl() {
  const p = Deno.run({ cmd: ["docker", "run", "-v", ".:/src", "-it", "p3rmaw3b/hyperbeam", "lua"]})
  await p.status()
}