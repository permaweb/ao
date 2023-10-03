import { basename, resolve } from "https://deno.land/std@0.200.0/path/mod.ts";

function walletArgs(wallet) {
  /**
   * Use wallet in pwd by default
   */
  wallet = wallet || "wallet.json";
  const walletName = basename(wallet);
  const walletDest = `/src/${walletName}`;

  const walletSrc = resolve(wallet);

  return [
    // mount the wallet to file in /src
    "-v",
    `${walletSrc}:${walletDest}`,
    "-e",
    `WALLET_PATH=${walletDest}`,
  ];
}

function contractSourceArgs(contractWasmPath) {
  /**
   * Use contract.wasm in pwd by default
   */
  contractWasmPath = contractWasmPath || "contract.wasm";
  const contractName = basename(contractWasmPath);
  const contractWasmDest = `/src/${contractName}`;

  const contractWasmSrc = resolve(contractWasmPath);

  return [
    // mount the wasm contract in pwd to /src
    "-v",
    `${contractWasmSrc}:${contractWasmDest}`,
    "-e",
    `CONTRACT_WASM_PATH=${contractWasmDest}`,
  ];
}

function tagArg(tags) {
  return tags ? ["-e", `TAGS=${tags.join(",")}`] : [];
}

/**
 * TODO:
 * - Validate existence of wallet
 * - Validate existence of contract wasm
 * - allow using environment variables to set things like path to wallet
 * - require confirmation and bypass with --yes
 */
export async function publish({ wallet, tag }, contractWasmPath) {
  const cmdArgs = [
    ...walletArgs(wallet),
    ...contractSourceArgs(contractWasmPath),
    ...tagArg(tag),
  ];

  const p = Deno.run({
    cmd: [
      "docker",
      "run",
      "--platform",
      "linux/amd64",
      ...cmdArgs,
      "-it",
      "p3rmaw3b/ao",
      "ao-source",
    ],
  });
  await p.status();
}
