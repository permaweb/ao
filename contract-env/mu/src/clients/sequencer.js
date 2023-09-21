const { createData, ArweaveSigner } = require('warp-arbundles');

let config = require('../config');

let sequencerClient = {
    writeInteraction: async function(data) {
        const rawDataBuffer = Buffer.from(data, 'base64');

        const response = await fetch(
            `${config.sequencerUrl}/gateway/v2/sequencer/register`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/octet-stream",
                Accept: "application/json",
              },
              body: rawDataBuffer,
            },
        );

        return await getJsonResponse(response);
    },

    buildAndSign: async function(contractId, input, tags) {
      let data = Math.random().toString().slice(-4);
      let signer = new ArweaveSigner(config.muWallet);

      tags.push({ name: "App-Name", value: "SmartWeaveAction" });
      tags.push({ name: "App-Version", value: "0.3.0" });
      tags.push({ name: "Contract", value: contractId });
      tags.push({ name: "Input", value: JSON.stringify(input) });
      tags.push({ name: "SDK", value: "ao" });

      let interactionDataItem = createData(data, signer, { tags: tags });
      await interactionDataItem.sign(signer);
      return interactionDataItem;
    }
}

async function getJsonResponse(response) {
    let r;
    try {
      r = await response;
    } catch (e) {
      throw new Error(
        `Error while communicating with sequencer: ${JSON.stringify(e)}`,
      );
    }
  
    if (!r?.ok) {
      const text = await r.text();
      throw new Error(`${r.status}: ${text}`);
    }
    const result = await r.json();
    return result;
}

module.exports = sequencerClient;