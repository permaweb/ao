const { readFileSync } = require('node:fs');

globalThis.MU_URL = "http://localhost:3004"
globalThis.CU_URL = "http://localhost:6363"
globalThis.SU_URL = "http://localhost:9000"
const { createProcess, createDataItemSigner } = require('@permaweb/ao-sdk');


(async function () {

    const CONTRACT_SRC = 'Isk_GYo30Tyf5nLbVI6zEJIfFpiXQJd58IKcIkTu4no'
    const wallet = JSON.parse(readFileSync(process.env.PATH_TO_WALLET).toString())

    const message = {
        "tags": [
          { "name": "function", "value": "eval"},
          { "name": "expression", "value": 'return send("feOEvFn5N8KxXjmHTGWQ26l_39Cm1_uEo4SiSil7cZU", { body = "Hello World"})'}
        ]
      }

    const tags = [
        { name: 'owner', value: 'HnKoL7ftH0BU3eUveKayuLpKu0XPnRehgBPu1GitZsQ' },
        { name: 'inbox', value: JSON.stringify([]) },
        { name: 'prompt', value: ':) ' },
        { name: '_fns', value: JSON.stringify({}) },
        { name: 'Scheduled-Interval', value: '5-minutes' },
        { name: 'Scheduled-Message', value: JSON.stringify(message) },
    ]

    await createProcess({
        srcId: CONTRACT_SRC,
        tags,
        signer: createDataItemSigner(wallet)
    }).then(console.log)
    .catch(console.error)

})()