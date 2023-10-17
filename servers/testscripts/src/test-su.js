// const fs = require('fs')
// const path = require('path')

// const { processStream } = require('arbundles')

// globalThis.MU_URL = 'http://localhost:3004'
// globalThis.CU_URL = 'http://localhost:3005'
// const { createDataItemSigner } = require('@permaweb/ao-sdk')

// const WarpArBundles = require('warp-arbundles');

// const { createData, ArweaveSigner } = WarpArBundles

// const CONTRACT_TX_ID = 'uJFN44vrnt4aLb4hBtfBryY-2z3ag_Us-e896ZaJxHM';
// const SEQUENCER_URL = 'http://localhost:9000';

// (async function () {
//   console.log('Testing ao...')

//   const walletPath = process.env.PATH_TO_WALLET

//   const walletKey = JSON.parse(fs.readFileSync(path.resolve(walletPath), 'utf8'))

//   const data = Math.random().toString().slice(-4)
//   const tags = [
//     { name: 'Contract', value: 'asdf' }
//   ]

//   const signer = new ArweaveSigner(walletKey)
//   const dataItem = createData(data, signer, { tags, target: CONTRACT_TX_ID })
//   await dataItem.sign(signer)

//   const response = await fetch(
//       `${SEQUENCER_URL}/message`,
//       {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/octet-stream',
//           Accept: 'application/json'
//         },
//         body: dataItem.getRaw()
//       }
//   )

//   const responseJson = await response.json()
//   console.log(responseJson)

//   const bundleFetch = await fetch(
//       `https://arweave.net/${responseJson.id}`,
//       {
//         method: 'GET'
//       }
//   )

//   processStream(bundleFetch.body)
//     .then((result) => {
//       // Handle the result here
//       console.log('Result bundle fetch')
//       console.log(result)
//       console.log(result[0].tags)
//     })
//     .catch((error) => {
//       // Handle any errors that occurred during processing
//       console.error(error)
//     })


//   const process_id = 'your_process_id';
//   const from_sort_key = 'your_from_sort_key';
//   const to_sort_key = 'your_to_sort_key';

//   const response2 = await fetch(
//     `${SEQUENCER_URL}/messages/${process_id}?from=${from_sort_key}&to=${to_sort_key}`, // Construct the URL with query parameters
//     {
//       method: 'GET',
//       headers: {
//         'Content-Type': 'application/json',
//         Accept: 'application/json',
//       },
//     }
//   );

//   if (response2.ok) {
//     const responseJson = await response2.json();
//     console.log(responseJson);
//   } else {
//     console.error('Failed to fetch data:', response.statusText);
//   }
// })()
