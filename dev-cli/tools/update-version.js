/* global Deno */

/**
 * Update the version in the manifest file.
 *
 * The version is parsed to ensure it is a valid Semver version
 * and throws if the input cannot be parsed into a valid Semver version
 *
 * USAGE:
 *
 * deno run -A update-version.js [-- <SCRIPT_ARG>]
 *
 * OPTIONS:
 *
 * The semver version to set in the manifest
 * --version=1.2.3
 */
import { parse } from 'https://deno.land/std@0.200.0/flags/mod.ts'
import { join } from 'https://deno.land/std@0.200.0/path/mod.ts'

import * as semver from 'https://deno.land/x/semver@v1.4.1/mod.ts'

import { VERSION } from '../src/versions.js'

async function main () {
  const { version: inputVersion } = parse(Deno.args)

  if (!inputVersion) {
    throw new Error(
      'Insufficient arguments. "--version" is required'
    )
  }

  const manifest = JSON.parse(await Deno.readTextFile('./deno.json'))

  const version = semver.clean(inputVersion)

  if (!version) {
    throw new Error(`${inputVersion} is not a valid semver version`)
  }

  manifest.version = version
  VERSION.CLI = version

  const here = new URL(import.meta.url).pathname
  const dest = join(here, '../..', 'deno.json')
  const versionDest = join(here, '../..', 'src', 'versions.js')

  await Deno.writeTextFile(dest, JSON.stringify(manifest, null, 2))
  await Deno.writeTextFile(versionDest, `/* eslint-disable */\nexport const VERSION = ${JSON.stringify(VERSION, null, 2)}`)

  return version
}

await main().then(console.log)
