import { basename, resolve } from "https://deno.land/std@0.200.0/path/mod.ts";

/**
 * TODO:
 * - Allow providing path to contract
 * - Validate existence of wallet
 * - allow using environment variables to set things like path to wallet
 * - require confirmation and bypass with --yes
 */
export async function publish({ wallet, tags }) {
  /**
   * Use wallet in pwd by default
   */
  wallet = wallet || "wallet.json";
  const walletName = basename(wallet);
  const walletDest = `/src/${walletName}`;

  const walletArgs = [
    // mount the wallet to file in /src
    "-v",
    `${resolve(wallet)}:${walletDest}`,
    "-e",
    `WALLET_PATH=${walletDest}`,
  ];
  const contractArgs = [
    // mount the wasm contract in pwd to /src
    "-v",
    ".:/src",
    "-e",
    `CONTRACT_WASM_PATH=/src/contract.wasm`,
  ];
  const tagsArgs = tags ? ["-e", `TAGS=${tags}`] : [];

  const cmdArgs = [
    ...walletArgs,
    ...contractArgs,
    ...tagsArgs,
  ];

  const p = Deno.run({
    cmd: [
      "docker",
      "run",
      "--platform",
      "linux/amd64",
      ...cmdArgs,
      "-it",
      "p3rmaw3b/hyperbeam",
      "hyperbeam-publish",
    ],
  });
  await p.status();
}
