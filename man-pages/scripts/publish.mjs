import Async from 'hyper-async';
import fs, { promises } from 'fs';
import Irys from '@irys/sdk/build/esm/node/irys';

const { fromPromise } = Async;

const getIrysArweave = () => {
  const url = "https://node2.irys.xyz";
  const token = "arweave";
  if (!process.env.PATH_TO_WALLET) throw new Error('Please set PATH_TO_WALLET in your environment.')
  const key = JSON.parse(fs.readFileSync(process.env.PATH_TO_WALLET).toString());

  const irys = new Irys({
    url,
    token,
    key,
  });
  return irys;
};

const intro = 'intro-to-ao-as-a-developer.md';
const excludes = ['readme.md', intro];

const main = () => Async.of(undefined).chain(fromPromise(getFiles)).chain(fromPromise(publishFiles)).chain(fromPromise(writeTransactions)).toPromise();

async function getFiles() {
  const files = (await promises.readdir('./')).filter(f => f.includes('.md')).filter(f => !excludes.includes(f.toLowerCase()));
  return files;
}

async function publishFile(name) {
  const irys = getIrysArweave();
  const response = await irys.uploadFile(`./${name}`);

  return {
    [name.replace('.md', '')]: response.id,
  }
}

async function publishFiles(files) {
  let transactions = {}
  for (const file of files) {
    const output = await publishFile(file)
    transactions = {
      ...transactions,
      ...output
    }
  }
  return transactions;
}

async function writeTransactions(transactions) {
  promises.writeFile('./transactions.json', JSON.stringify({
    transactions
  }))
}


main().then(() => console.log("Updated transactions written to ./transactions.json")).catch(console.log)     