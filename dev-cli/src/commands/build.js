export async function build() {
  const p = Deno.run({ cmd: ["docker", "run", "-v", ".:/src", "p3rmaw3b/hyperbeam", "emcc-lua"]})
  await p.status()
}