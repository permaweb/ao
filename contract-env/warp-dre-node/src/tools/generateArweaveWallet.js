const Arweave = require('arweave');
const readline = require('readline');
const fs = require('fs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
const path = '.secrets/node-jwk.json';
const main = async () => {
  if (fs.existsSync(path) && !process.argv.includes('--override')) {
    console.log(`File ${path} already exists. Use --override if you want to override`);
    process.exit(1);
  }
  const arweave = Arweave.init({});
  let key = await arweave.wallets.generate();
  fs.writeFileSync(path, JSON.stringify(key));
  console.log(`Wallet key generated: ${path}`);
  process.exit(0);
};

main().catch((err) => console.error(err));
