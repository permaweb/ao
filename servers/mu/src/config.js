
if (!process.env.WALLET) {
  console.error(
    "Please pass a WALLET into the environment. eg. process.env.WALLET should be your JWK string."
  );
}

let config = {
  muWallet: JSON.parse(process.env.WALLET || ""),
  sequencerUrl: "https://gw.warp.cc",
  port: 3004,
};

export default config;
