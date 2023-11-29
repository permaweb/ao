import Arweave from 'arweave'
import {writeFile} from 'fs'


const arweave = Arweave.init({});

const wallets = ['wallet1', 'wallet2']

wallets.map(async (w) => {
  const  wallet = await arweave.wallets.generate();
  writeFile(`${w}.json`, JSON.stringify(wallet), (err) => {
    if (err) {
      console.error('Error writing to file:', err);
    } else {
      console.log(`${w} written successfully!`);
    }
  });
})