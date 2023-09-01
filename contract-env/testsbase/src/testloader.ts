
import HyperbeamLoader from "@permaweb/hyperbeam-loader";


(async function () {
    let wasmBinary = await fetch(`https://arweave.net/6ghX3hP5m0FdhTVAXO-79mqXf2P7oEJF3-VNWh-fYa8`);

    console.log(wasmBinary);

    const handle = HyperbeamLoader(wasmBinary);
    /* SmartWeave READ-ONLY Env Variables */
    const SmartWeave = {
        transaction: {
            id: "1",
        },
    };
    const result = handle({ balances: 1 }, {
        caller: "1",
        input: { function: "balance" },
    }, SmartWeave);

    console.log(result);
})();