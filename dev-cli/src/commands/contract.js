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

function tagArg(tags) {
  return tags ? ["-e", `TAGS=${tags.join(",")}`] : [];
}

function sourceArgs(src) {
  return [
    "-e",
    `CONTRACT_SOURCE_TX=${src}`,
  ];
}

function stateArgs(initialStateStr) {
  try {
    JSON.parse(initialStateStr);
    return [
      "-e",
      `INITIAL_STATE=${initialStateStr}`,
    ];
  } catch {
    throw new Error("initial state must be valid json");
  }
}

/**
 * TODO:
 * - Validate existence of wallet
 * - allow using environment variables to set things like path to wallet
 * - require confirmation and bypass with --yes
 */
export async function contract({ wallet, tag, source }, initialState) {
  const cmdArgs = [
    ...walletArgs(wallet),
    ...tagArg(tag),
    ...sourceArgs(source),
    ...stateArgs(initialState),
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
      "ao-contract",
    ],
  });
  await p.status();
}
