import { readFileSync } from 'node:fs';

import { connect, createDataItemSigner} from '@permaweb/ao-sdk'

const {
  spawnProcess,
  sendMessage
} = connect({
  GATEWAY_URL: "https://arweave.net", 
  MU_URL: "http://localhost:3004",
  CU_URL: "http://localhost:6363",
  SU_URL: "http://localhost:9000"
});

(async function () {
  const PROCESS_SRC = 'ptp7GrWekxYIRAkOrIDFfZB76YXkbIq3okQsNiWOhsM';
  const wallet = JSON.parse(readFileSync(process.env.PATH_TO_WALLET).toString());

  const tags2 = [
    { name: 'owner', value: 'HnKoL7ftH0BU3eUveKayuLpKu0XPnRehgBPu1GitZsQ' },
    { name: 'inbox', value: JSON.stringify([]) },
    { name: 'prompt', value: ':) ' },
    { name: '_fns', value: JSON.stringify({}) },
  ];

  let c2 = await spawnProcess({
    srcId: PROCESS_SRC,
    tags: tags2,
    signer: createDataItemSigner(wallet),
  });

  console.log(`Process 2 ${c2}`);

  let m1 = await sendMessage({
    processId: c2,
    tags: [
      { name: 'function', value: 'eval' },
      { name: 'expression', value: `spawn("${PROCESS_SRC}")` },
    ],
    signer: createDataItemSigner(wallet),
  })

  console.log(`Message 1 to process 2 ${m1}`);
})();
