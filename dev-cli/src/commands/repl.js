export async function repl() {
  const p = Deno.run({
    cmd: [
      "docker",
      "run",
      "--platform",
      "linux/amd64",
      "-v",
      ".ao:/src",
      "-it",
      "p3rmaw3b/ao",
      "lua",
    ],
  });
  await p.status();
}
