export async function run(_, f) {
  const p = Deno.run({
    cmd: [
      "docker",
      "run",
      "--platform",
      "linux/amd64",
      "-v",
      ".:/src",
      "p3rmaw3b/ao",
      "lua",
      f,
    ],
  });
  await p.status();
}
