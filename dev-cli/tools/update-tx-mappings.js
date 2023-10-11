/* global Deno */

/**
 * Add new Canonical Version name -> Transaction id mapping
 * in the manifest file.
 *
 * This allows us to keep track of which transaction contains which version
 * of the binaries and install script
 *
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
 * Whether these transaction ids should be used as the latest version in the manifest
 * --latest
 */
import { parse } from 'https://deno.land/std@0.200.0/flags/mod.ts'
import { join } from 'https://deno.land/std@0.200.0/path/mod.ts'

async function main () {
  const { binaries, install, version, latest } = parse(Deno.args)

  const manifest = JSON.parse(await Deno.readTextFile('./deno.json'))

  if (!binaries || !install || !version) {
    throw new Error(
      'Insufficient arguments. "--binaries", "--install", and "--version" are required'
    )
  }

  if (latest) {
    console.log(`Updating latest txMappings to version ${version}...`)
    manifest.txMappings.binaries.latest = binaries
    manifest.txMappings.install.latest = install
  }

  console.log(`Writing new txMappings for version ${version}...`)
  manifest.txMappings.binaries[version] = binaries
  manifest.txMappings.install[version] = install

  const here = new URL(import.meta.url).pathname
  const dest = join(here, '../..', 'deno.json')

  await Deno.writeTextFile(dest, JSON.stringify(manifest, null, 2))
}

await main()
