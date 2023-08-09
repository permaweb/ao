export async function run(_, f) {
  const p = Deno.run({ cmd: ["docker", "run", "-v", ".:/src", "p3rmaw3b/hyperbeam", "lua", f]})
  await p.status()
}