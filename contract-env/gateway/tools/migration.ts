/* eslint-disable */
import fs from 'fs';
import { DatabaseSource } from '../src/db/databaseSource';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { Knex } from 'knex';

const argv = yargs(hideBin(process.argv)).parseSync();
const envPath = argv.env_path;

async function main() {
  require('dotenv').config({
    path: envPath,
  });

  try {
    const dbSource = new DatabaseSource([
      { client: 'pg', url: process.env.DB_URL as string },
      {
        client: 'pg',
        url: process.env.DB_URL_MIGRATED as string,
        ssl: {
          rejectUnauthorized: false,
          ca: fs.readFileSync('.secrets/ca.pem'),
          cert: fs.readFileSync('.secrets/cert_user.pem'),
          key: fs.readFileSync('.secrets/key_user.pem'),
        },
      },
    ]);

    const contractInsert = {
      contract_id: 'GNRKhtK5byjZy3JRcTS1r3B-bABOdZCss7Qu3zLMsH0',
      src_tx_id: '2puD7UhzBRceGbImVTO1-uCwgZvw8OvtWgAih33LZ3k',
      init_state: {
        ticker: 'EXAMPLE_PST_TOKEN',
        owner: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M',
        canEvolve: true,
        balances: {
          'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M': 10000000,
          '33F0QHcb22W7LwWR1iRC8Az1ntZG09XQ03YWuw2ABqA': 23111222,
          'jnioZFibZSCcV8o-HkBXYPYEYNib4tqfexP0kCBXX_M': 1000000,
        },
        wallets: {},
      },
      owner: 'jnioZFibZSCcV8o-HkBXYPYEYNib4tqfexP0kCBXX_M',
      type: 'pst',
      pst_ticker: 'EXAMPLE_PST_TOKEN',
      pst_name: undefined,
      block_height: 1137070,
      block_timestamp: 1678715592,
      content_type: 'application/json',
      contract_tx: {
        signature:
          'm6A26TORclYfu4oiRDrRcWMPeQsEq7rJ_Cyjnzx4aXcVsuJYTxYN0WslKLCwXw9m5aLmSE1VChrQmucUA5G397uEvEW-yf1oue5rxFMSrgr1dtlGLIdsMkGO6NikUO4-vSl81QtRplRNqBlk6AenfPvm85YfjobRQ8auShIN_pVCDpmUuCpFucul6eUwLQE07Zh7PE2F8FSmZwl32xKHBBsWiY5XdixTrqgniOFvIQ1MCztWz63UiAYfhx8pgypab7M083YDyzSyCG6xXlxJF_XHH9T_TS5M9Ps4CFvUr0nG_pgfXO45bbE_3oJ7EbIe9X1D9ariF2vy12-tBMBJwq0XkM4IrejeFGRUAV6Llzise8tc2plkFaEccYUyLgvj5Ad9CHVJyDceXZpRtGR3PSHxDZYo1W-Fl8baPYgxZWteE8YBojKI7AVjXusoXOlBc5lIpoPimH_trxY97eKSw2shqYkR2aO6MalwnhK7VW5emNtrOmRRx4vwvIWUoRS4K-3HdW6u_r9FM7jlRbINHhN7-QOr1_l7ZubE5fYRaNJHl-0RyXKE5J2ZmviorQP_NB9WcWE-Fq4jg39bIrOSzh26mYKBM0f1GNljU6NIPSDMfWsQTMlHhVyW6N7PWwUWkAixUuImNXse7PZ1bjmUtIpXALplInVfrdur18kRf-s',
        owner:
          'w8rd80f6wrNZLwoQAcmy6wXW7CszvwpJ3NRbicyuMO6GGQjwFHk4fomRHHDw6_I_i6Z4bNqjbFQm1N3vRNzD_yJB3nHHJW3_xiXTU6q1DXa5E4FcSShcUd9BPOgpXD-BvAcSJaMtj31zaJ9nodwZu6JyKJmXmu567MKPR8pvNuoWARLNeuSmMxG5QWF9ne1bJouLNovofTVHSOfbIafe4mPBHU3Idr4mV7TuDe8lV238W8g5zanzsCPO9wqK6O1x7a7SmVdwmkQV6_uSaYw0lldsewP1iKsHHHbFkVG9-AFp0q71JqAYuruN_753nOBpxvScrgvZopHRxs7DxEWROv5g87C05e8aiIQbhQp7NT_G5WSMBJyOlRXc5d6pKePkz0zyZD6tUg7rNNuYLAeekPCqz1lM8umymVySsh3gCHRtxEGOcEqcM65RL4USF5piJI8cSzrYXsT462nj3ZCdwzSdRrp8ATRI6Ty2GMyqRGs_tN6yJrl_A5KFWwp4Z0PtXGpjeuU4OZtVgwMhplyJFZPgRqNj7K1DFJQGmSaipZdjZ-IwcUwVpJ9hz2yKZb-ScbZvqujFhDAD8fnaK2yWbpYnLTVsSPIUOoBArUouCWmhLrc3hNeTq-QtBl1yrOtbKuqzp71V8dwMkpVvSXG97fJjqwKUEPjW-5vouM4Ws1M',
        target: '',
        tags: [[Object], [Object], [Object], [Object], [Object], [Object]],
        data: 'eyJ0aWNrZXIiOiJFWEFNUExFX1BTVF9UT0tFTiIsIm93bmVyIjoidWhFLVFlWVM4aTRwbVV0bnhReUhEN2R6WEZOYUo5b01LLUlNLVFQTlk2TSIsImNhbkV2b2x2ZSI6dHJ1ZSwiYmFsYW5jZXMiOnsidWhFLVFlWVM4aTRwbVV0bnhReUhEN2R6WEZOYUo5b01LLUlNLVFQTlk2TSI6MTAwMDAwMDAsIjMzRjBRSGNiMjJXN0x3V1IxaVJDOEF6MW50WkcwOVhRMDNZV3V3MkFCcUEiOjIzMTExMjIyLCJqbmlvWkZpYlpTQ2NWOG8tSGtCWFlQWUVZTmliNHRxZmV4UDBrQ0JYWF9NIjoxMDAwMDAwfSwid2FsbGV0cyI6e319',
      },
      bundler_contract_tx_id: 'wX3uok4QKv5QL0LCujc-M56z3nIMH64sWiVWZfmrL6c',
      bundler_contract_node: 'https://node2.bundlr.network',
      bundler_contract_tags:
        '[{"name":"App-Name","value":"SmartWeaveContract"},{"name":"App-Version","value":"0.3.0"},{"name":"Contract-Src","value":"2puD7UhzBRceGbImVTO1-uCwgZvw8OvtWgAih33LZ3k"},{"name":"SDK","value":"Warp"},{"name":"Nonce","value":"1678715653182"},{"name":"Content-Type","value":"application/json"}]',
      bundler_response:
        '{"id":"wX3uok4QKv5QL0LCujc-M56z3nIMH64sWiVWZfmrL6c","timestamp":1678715653451,"version":"1.0.0","public":"pGFsvdSB9sxbwU5L4HD2v12DK40kzZ5N69s6WlI3Uw9pFdHMHei3n1Tv4jvZqU9yeIMGsS60MQRvfJK1AEoNYsQqk4Rciajw0_IemZdwlt4u4voDALRalrQ3NV4knOlHRY11anqV0fNhikWCsiRPukIRZrdcFfqzFr0boH8bou7DgESNvWxROOxSC149oKxJ06FQsBDaIeElBsR8qTddybvXqMagXCM9y_HNrtAoz_8LgPjQtK5LFEbXhh9PyI_GOuoHyzJUc9Sm-V9kCB4kTm-SHrPbETQnvejZBcqEHxNcDNWBv6CWjj3-0V3dFMhjM1cy14d0Lm4j0IyRLm9bHM3s0ssVDd20gjWyar-D0o6guJIrteEC7UGR-w1yvXoGuIwdfZeoSAZ_CU9FrOJfQCTDs2aLgdCNeYKXg0Rt8YZL_elZnG7utCkO78TwxbGqear_I-1dlO39CUlo13YSS6pPonioWqkzXcXh93G7BYjgUxcPJ31kLyr2wBRA4OObAYRvh-5V3TkULlmwR4Q0pV3cUeOLI94b4WhaDZDI_RIJiCXQvtGy190NqTBeVogPrrAXLFkK0E013GByHrmzZoELfSUorjK-bDk4wXxdbVqzY7KXP-NEt3Bu-woinbUf56i3DXLrYlwINYK39VUydGpcQLZ5EDCL4u_IL_iFPt0","signature":"eo-ijn4yd7_I9zVliJcdFeX__hx9p_yk_o49MON5wHF5NeyESua_w3-gf7QTD1Q30fn_HsW7CU-xbd_PyRntOABzifUq_c4ZTH4AWF1sBx-yusGmYhVvUccqBL7gZF9hXLBi4Dm8tpk74OfUdZALu1pifDD2o5BCIsIJ7Jxl5GO-pLPgvmQ_fKfIYU_rPMYRFjNWtTGpw1KVxOOH0bvl25DmgYLFWNXba1UF--4LqrjGgNSjOCGmHrxbZlI3Qn1AgdzpQYJDhr4ozB-GS-LV0zdcJGWgYr9mlBOImsYB7E_DtchFCvQij-pazvXUctRaKfdbsjLtZQ7CBbgkM5bR0f_PUT0SW_aD1RZMcMeI7qKQow1QDDFcoktVXtWv_OBsB39HQG-3p9ytN3MZ7bATaMqtp5IKoEHJVrASs9T2l1DnfAlLUyARgutukHT5L0FUCgIDY8tUuUwJBzv57d8U0tCRn26S_9ZQ_Qejd2T3zEFuas_yaJNTHloyXol5KKNGzOAh7rlJ6Ciavn-wcyxT_ExRuoOkFllQZ8bNN0VbuL6R2-xtLFFKMWP3ynqabcOZuZ4CaVV0kMuil2n9IYakmux6OSRpXqFz4tjG9Sj0YCi2Rif_bKGI-h_oLwhvecbWJ0aFDK-Gqbgj-hcIAWS-bOdnNYA4R6LE2L7lMCx4YSg","deadlineHeight":1141070,"block":1141070,"validatorSignatures":[]}',
      testnet: null,
      deployment_type: 'warp-direct',
      manifest: null,
    };

    await dbSource.loopThroughDb(async (db: Knex, loop: number) => {
      if (loop == 0) {
        console.log(loop);
        await db('contracts').insert(contractInsert);
      } else if (loop == 1) {
        console.log(loop);
        throw new Error('1');
      } else if (loop == 2) {
        console.log(loop);
        throw new Error('2');
      } else if (loop == 3) {
        console.log(loop);
        throw new Error('3');
      }
    }, contractInsert.contract_id);
  } catch (e) {
    console.log(e);
  }
}

main().catch((e) => console.error(e));
