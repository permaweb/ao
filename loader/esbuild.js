import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/index.cjs"],
  platform: "node",
  format: "cjs",
  bundle: true,
  outfile: "dist/index.cjs",
});
