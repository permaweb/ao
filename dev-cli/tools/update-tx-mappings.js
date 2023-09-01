/**
 * USAGE:
 *
 * deno run -A update-tx-mappings.js [-- <SCRIPT_ARG>]
 *
 * OPTIONS:
 *
 * The transaction id that contains the binaries
 * --binaries=SYHBhGAmBo6fgAkINNoRtumOzxNB8-JFv2tPhBuNk5c
 *
 * The transaction id that contains the install script
 * --install=F63wJCavB_sN2xxW-qtQ1Vv7_eRgmYCdcoQPMp_-N0w
 *
 * The semver version
 * --version=1.2.3
 *
 * Whether these transaction ids should be used as the latest version in the manifest
 * --latest
 */
import { parse } from "https://deno.land/std@0.200.0/flags/mod.ts";
import { join } from "https://deno.land/std@0.200.0/path/mod.ts";

import manifest from "../deno.json" assert { type: "json" };

async function main() {
  const { binaries, install, version, latest } = parse(Deno.args);

  if (!binaries || !install || !version) {
    throw new Error(
      'Insufficient arguments. "--binaries", "--install", and "--version" are required',
    );
  }

  manifest.version = version;

  if (latest) {
    console.log(`Updating latest txMappings to version ${version}...`);
    manifest.txMappings.binaries.latest = binaries;
    manifest.txMappings.install.latest = install;
  }

  console.log(`Writing new txMappings for version ${version}...`);
  manifest.txMappings.binaries[version] = binaries;
  manifest.txMappings.install[version] = install;

  const here = new URL(import.meta.url).pathname;
  const dest = join(here, "../..", "deno.json");

  await Deno.writeTextFile(dest, JSON.stringify(manifest, null, 2));
}

await main();
