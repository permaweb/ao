/* eslint-disable */

const Arweave = require("arweave");

const Undici = require("undici");
const fetch = Undici.fetch;

async function test() {
  for (let i = 0; i < 100; i++) {
    const response = await fetch(`https://arweave.net:443/tx/4o-2xMPa45BXjGuII_LbOMQWfhE1F0qugdEUZvRlXRY`)
      .then((res) => {
        return res.ok ? res.json() : Promise.reject(res);
      })
      .catch((error) => {
        if (error.body?.message) {
          this.logger.error(error.body.message);
        }
        throw new Error(`Unable to retrieve info. ${error.status}.`);
      });

    console.log(response);


    /*const response = await fetch('https://arweave.net:443/4o-2xMPa45BXjGuII_LbOMQWfhE1F0qugdEUZvRlXRY');
    const buffer = await response.arrayBuffer();
    const result = Arweave.utils.bufferToString(buffer);
    console.log(result);*/
  }
}

test().finally();

