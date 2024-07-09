import Irys from "@irys/sdk";
import fs from "fs";

const url = "https://node1.irys.xyz";
const token = "arweave";
// load the JWK wallet key file from disk
console.log(process.cwd());
let key = JSON.parse(
  fs
    .readFileSync(
      "./wallet.json"
    )
    .toString()
);

const irys = new Irys({
  url, // URL of the node you want to connect to
  token, // Token used for payment and signing
  key, // Arweave wallet
});

// Create the transaction
const tx = irys.createTransaction("1984", {
  tags: [
    {name: "Content-Type", value: "text/plain"},
    {name: "Type", value: "Scheduler-Location"},
    {name: "Time-To-Live", value: "3600000"},
    {name: "Url", value: "http://127.0.0.1:9000"},
    {name: "Data-Protocol", value: "ao"},
    {name: "Variant", value: "ao.TN.1"},
  ],
});

// Sign the transaction
await tx.sign(); // ID is now set
console.log(`Tx created and signed, ID=${tx.id}`);

// Upload the transaction
const receipt = await tx.upload();
console.log(`Tx uploaded. https://gateway.irys.xyz/${receipt.id}`);
