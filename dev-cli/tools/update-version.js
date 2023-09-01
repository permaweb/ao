/**
 * USAGE:
 *
 * deno run -A update-version.js [-- <SCRIPT_ARG>]
 *
 * OPTIONS:
 *
 * The semver version to set in the manifest
 * --version=1.2.3
 */
import { parse } from "https://deno.land/std@0.200.0/flags/mod.ts";
import { join } from "https://deno.land/std@0.200.0/path/mod.ts";

import * as semver from "https://deno.land/x/semver@v1.4.1/mod.ts";

import manifest from "../deno.json" assert { type: "json" };

async function main() {
  let { version: inputVersion } = parse(Deno.args);

  if (!inputVersion) {
    throw new Error(
      'Insufficient arguments. "--version" is required',
    );
  }

  const version = semver.clean(inputVersion);

  if (!version) {
    throw new Error(`${inputVersion} is not a valid semver version`);
  }

  manifest.version = version;

  const here = new URL(import.meta.url).pathname;
  const dest = join(here, "../..", "deno.json");

  await Deno.writeTextFile(dest, JSON.stringify(manifest, null, 2));

  // stdout, so can be piped or saved to a variable
  console.log(version);
}

await main();
