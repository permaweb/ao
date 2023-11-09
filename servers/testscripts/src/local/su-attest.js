
import { readFileSync } from 'node:fs';

import WarpArBundles from "warp-arbundles"
const { createData, ArweaveSigner } = WarpArBundles;

(async function () {

  const wallet = JSON.parse(readFileSync(process.env.PATH_TO_WALLET).toString());
  const data = Math.random().toString().slice(-4)
  const tags = [{name: 'ao-load', value: 'CX7gFPcJ2HoDg-EMoRSe4Eom04kjQ-RoeO8UeL8WIzo'}]

  const signer = new ArweaveSigner(wallet)
  const dataItem = createData(data, signer, { tags, target: 'UO6S6DLXzn3Jlz7E2XCiG3hZcRYTmzpOZpvZwBrCuqQ' })
  await dataItem.sign(signer)

  const response = await fetch(
      `http://localhost:9000/message`,
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
  console.log('Su Response 1 for Contract 1')
  console.log(responseText)
})();
