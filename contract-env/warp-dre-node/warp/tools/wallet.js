const Arweave = require("arweave");

const arweave = Arweave.init({
  host: "arweave.net",
  port: 443,
  protocol: "https",
});
const wallet = arweave.wallets.generate()
  .then(w => {
    arweave.wallets.jwkToAddress(w).then((address) => {
      console.log(address);
      //1seRanklLU_1VTGkEk7P0xAwMJfA7owA1JHW5KyZKlY
    });
  });
