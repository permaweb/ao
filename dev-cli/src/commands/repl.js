export async function repl() {
  const pwd = Deno.cwd();
  const p = Deno.run({
    cmd: [
      "docker",
      "run",
      "--platform",
      "linux/amd64",
      "-v",
      `${pwd}:/src`,
      "-it",
      "p3rmaw3b/ao",
      "lua",
    ],
  });
  await p.status();
}
