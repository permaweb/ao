export async function build() {
  const pwd = Deno.cwd()
  const p = Deno.run({
    cmd: [
      "docker",
      "run",
      "--platform",
      "linux/amd64",
      "-v",
      `${pwd}:/src`,
      "p3rmaw3b/ao",
      "emcc-lua",
    ],
  });
  await p.status();
}
