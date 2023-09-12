import * as esbuild from "esbuild";

/**
 * By importing from manifest, build will always be in sync with the manifest
 */
import manifest from "./package.json" assert { type: "json" };

// CJS
await esbuild.build({
  entryPoints: ["src/index.js"],
  platform: "node",
  format: "cjs",
  bundle: true,
  outfile: manifest.main,
});

// ESM
await esbuild.build({
  entryPoints: ["src/index.js"],
  platform: "node",
  format: "esm",
  bundle: true,
  outfile: manifest.module,
});
