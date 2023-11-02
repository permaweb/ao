import { readFileSync } from 'node:fs';


import WarpArBundles from "warp-arbundles"
const { createData, ArweaveSigner } = WarpArBundles

globalThis.MU_URL = "http://localhost:3004"
globalThis.CU_URL = "http://localhost:6363"
globalThis.SU_URL = "http://localhost:9000"

import {
  createProcess,
  createDataItemSigner,
  writeMessage
} from '@permaweb/ao-sdk';

(async function () {
  const PROCESS_SRC = 'Isk_GYo30Tyf5nLbVI6zEJIfFpiXQJd58IKcIkTu4no';
  const wallet = JSON.parse(readFileSync(process.env.PATH_TO_WALLET).toString());

  const tags1 = [
    { name: 'owner', value: 'HnKoL7ftH0BU3eUveKayuLpKu0XPnRehgBPu1GitZsQ' },
    { name: 'inbox', value: JSON.stringify([]) },
    { name: 'prompt', value: ':) ' },
    { name: '_fns', value: JSON.stringify({}) },
  ];

  let c1 = await createProcess({
    srcId: PROCESS_SRC,
    tags: tags1,
    signer: createDataItemSigner(wallet),
  });

  console.log(`Process 1 ${c1}`);

  const message = {
    tags: [
      { name: 'function', value: 'eval' },
      { name: 'expression', value: `return send("${c1}", { body = "Hello World"})` },
    ],
  };

  const tags2 = [
    { name: 'owner', value: 'HnKoL7ftH0BU3eUveKayuLpKu0XPnRehgBPu1GitZsQ' },
    { name: 'inbox', value: JSON.stringify([]) },
    { name: 'prompt', value: ':) ' },
    { name: '_fns', value: JSON.stringify({}) },
    { name: 'Scheduled-Interval', value: '5-minutes' },
    { name: 'Scheduled-Message', value: JSON.stringify(message) },
  ];

  let c2 = await createProcess({
    srcId: PROCESS_SRC,
    tags: tags2,
    signer: createDataItemSigner(wallet),
  });

  console.log(`Process 2 ${c2}`);

  let m1 = await writeMessage({
    processId: c2,
    tags: [
      { name: 'function', value: 'eval' },
      { name: 'expression', value: `return send("${c1}", { body = "Hello World"})` },
    ],
    signer: createDataItemSigner(wallet),
  })

  console.log(`Message 1 to process 2 ${m1}`);

  const data = Math.random().toString().slice(-4)
  const tags = []

  const signer = new ArweaveSigner(wallet)
  const dataItem = createData(data, signer, { tags, target: c2 })
  await dataItem.sign(signer)

  const response = await fetch(
      `http://localhost:9000/monitor/${c2}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          Accept: 'application/json'
        },
        body: dataItem.getRaw()
      }
  )

  const responseText = await response.text()
  console.log('Monitor Response 1 for Contract 2')
  console.log(responseText)
})();
