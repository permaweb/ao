export async function build() {
  const p = Deno.run({
    cmd: [
      "docker",
      "run",
      "--platform",
      "linux/amd64",
      "-v",
      ".:/src",
      "p3rmaw3b/hyperbeam",
      "emcc-lua",
    ],
  });
  await p.status();
}
