import { describe, test } from 'node:test'
import * as assert from 'node:assert'
import path from 'node:path'
import fs from 'node:fs'

import { createLogger } from '../logger.js'
import { processMsgWith } from './processMsg.js'
import signerClient from '../clients/signer.js'

const logger = createLogger('ao-mu:processMsg')

describe('processMsgWith', () => {
  test('process message result', async () => {
    const walletPath = process.env.PATH_TO_WALLET
    const walletKey = JSON.parse(fs.readFileSync(path.resolve(walletPath), 'utf8'))
    const processMsg = processMsgWith({
      locateProcess: async () => {
        return { url: 'https://su10.ao-testnet.xyz' }
      },
      selectNode: async () => {
        return 'https://cu.ao-testnet.xyz'
      },
      writeDataItem: async ({ data, suUrl }) => {
        console.log(data)
        assert.equal(suUrl, 'https://su10.ao-testnet.xyz')
        return { id: 'id', timestamp: 1234567 }
      },
      fetchResult: async () => {
        return {
          Messages: [],
          Assignments: [],
          Spawns: [],
          Output: [],
          GasUsed: 703247221
        }
      },
      buildAndSign: signerClient.buildAndSignWith({ MU_WALLET: walletKey, logger }),
      writeDataItemArweave: async (data) => {
        console.log(data)
      },
      isWallet: async (processId) => {
        assert.equal(processId, 'Sa0iBLPNyJQrwpTTG-tWLQU-1QeUAJA73DdxGGiKoJc')
        return false
      },
      fetchSchedulerProcess: async (processId, suUrl) => {
        assert.ok(
          processId === 'Sa0iBLPNyJQrwpTTG-tWLQU-1QeUAJA73DdxGGiKoJc' ||
          processId === 'C2FJvf6Ne9vQk7vQvMzwD3ZrSq15FL8jfro0rU5iPMM',
          `processId should be one of the expected values, but got ${processId}`
        )
        assert.equal(suUrl, 'https://su10.ao-testnet.xyz')
        return {
          process_id: 'Sa0iBLPNyJQrwpTTG-tWLQU-1QeUAJA73DdxGGiKoJc',
          block: '000001370636',
          owner: {
            address: 'vh-NTHVvlKZqRxc8LyyTNok65yQ55a_PJ1zWLb9G2JI',
            key: 'raUmzBSXLPX-G97EjgnPSAVYLbHHVF6yDJsoTGBB6CIl3CzDMULfOH5oAlHCWzQtqQaLq3JipwnD8qPGF4veJgn6_fYa5KRogN3EQpPSwb7akpo3Iutt5z0G8Hem9t3xw6ux6-DCxZL9p7FStMn8-DPrxAmG3Jz8yQP0lZUFDfeIhAds7wW1B0Z46IdTjkYv-JnvKmawR15Izw9M4ywh0FF9GPadGpisdZ1JmBNOfg3dd0y2V4HBa_ZT95H-qWdzo8f4YZPFLEddHlFhuFNZuHeYx8fLVCPziyoe36DM4jd4O1_80RtKWbFpwBWL4vdtuX0qUFSGEG9IQNECtsKLhXQnkYtjST-tJpWSJ8PmXfCeJsb2zxGfq8zZANGGmEcASP8KicxQEAKUd9boOEYDEbh_G37SJsjggxV9c09Wh2v8fW4ANv64F2rKY5FfAMhdDCcYNrYbk0wma9VFK2RWQrV1Am4XejGibrq0ulBSmB1VZDOi_BI_arsdZW9mxvI-FH9huiWhq_5nQ6kFMgkbO1vh09XyqrB2eNrxHYPpk4bEUfQ3TgjW-LKdn_0ERTgNhHamRACdYc7mcfDX3g8T3VfUtyH7Db8t-Fx_Xqj3qIDv2FB2ed1AHqk03YH-uE_Xe5XdZ8qqsJPgrqmXQXEuI7co4jI3SzHa6ewd3AhAHlc'
          },
          tags: [
            {
              name: 'App-Name',
              value: 'aos'
            },
            {
              name: 'Name',
              value: 'aocred'
            },
            {
              name: 'aos-Version',
              value: '1.9.9'
            },
            {
              name: 'Data-Protocol',
              value: 'ao'
            },
            {
              name: 'Variant',
              value: 'ao.TN.1'
            },
            {
              name: 'Type',
              value: 'Process'
            },
            {
              name: 'Module',
              value: '9afQ1PLf2mrshqCTZEzzJTR2gWaC9zNPnYgYEqg1Pt4'
            },
            {
              name: 'Scheduler',
              value: '_GQ33BkPtZrqxA84vM8Zk-N2aO0toNNu_C-l-rawrBA'
            },
            {
              name: 'SDK',
              value: 'aoconnect'
            },
            {
              name: 'Content-Type',
              value: 'text/plain'
            }
          ],
          timestamp: 1708786489196,
          data: '5807',
          anchor: null,
          signature: 'TnQqm1X0vvYUuRCY_g1-TlN6X3zIToEB2I4MOTHYdpemJGLE1yhHdoZ6DEzeXKpGjhFMK-Fs_Ff8rMHT8DP6fi32m0W5LjFfUXyNmNWsXhpnQXi1vMZ0z9tfiNDcKddctn8evb09cPUNbyK8VKFeeqM63RCZd3CUZqe3u3dZQGZj8I0nydPIoXBAsHnUvPaohpDvp94ClQvlrOJ1z-Xv6_uwGOitUo09oJfhbZKvT5U6O5Nx44uofWPOm2RDxCPBzXJ6pUc5sqdO7Evf0plHFVCZg3YSAS9u_2xsUA-pAjZQPg6UTuHZtrW-4nNcjcFmxl5YBcuEkNEhkpMVr7MajTqfJkjqLYbUxfEN0YMHI3lMmgoebYRMH3aohF3438Vyim_bMDPmNvam7avTJl2gEO9MHjGea3vsVeyi8DJ7fmHetANthX1TRF8uHsUezQwh37Tp9o_0bogMZMtGLn1345YJNZqzX1OBbJK049iizY1I6Yqu-3xry_5Jrk79CPpCKENiw7Zr4_fgkDpnEfz1cA0OU7AttC90lvtIEfu41njrdkk_RCt-q9kc9W_duwcCHMyUoTGtDn2atpHg4jXo5a78dJzqg1KwgxviNEq1XTLmYIXI4Ld1QfAnjTDNBXQ7eQ6xQisqz9QYN6SO6yRy7kd2pGXi8pm0CrgWsI6qmH8'
        }
      },
      logger
    })

    const result = await processMsg({
      cachedMsg: {
        processId: 'Sa0iBLPNyJQrwpTTG-tWLQU-1QeUAJA73DdxGGiKoJc',
        initialTxId: 'initial-id',
        fromProcessId: 'C2FJvf6Ne9vQk7vQvMzwD3ZrSq15FL8jfro0rU5iPMM',
        msg: {
          Target: 'Sa0iBLPNyJQrwpTTG-tWLQU-1QeUAJA73DdxGGiKoJc',
          Tags: [
            {
              name: 'Data-Protocol',
              value: 'ao'
            },
            {
              name: 'Variant',
              value: 'ao.TN.1'
            },
            {
              name: 'Type',
              value: 'Message'
            },
            {
              name: 'From-Process',
              value: 'C2FJvf6Ne9vQk7vQvMzwD3ZrSq15FL8jfro0rU5iPMM'
            },
            {
              name: 'From-Module',
              value: '5l00H2S0RuPYe-V5GAI-1RgQEHFInSMr20E-3RNXJ_U'
            },
            {
              name: '4',
              value: '4'
            },
            {
              name: 'Recipient',
              value: 'U3Yy3MQ41urYMvSmzHsaA4hJEDuvIm-TgXvSm-wz-X0'
            },
            {
              name: 'Action',
              value: 'Transfer'
            },
            {
              name: 'Quantity',
              value: '100'
            },
            {
              name: 'X-Expected-Output',
              value: '2163'
            },
            {
              name: 'X-Slippage-Tolerance',
              value: 0.1
            },
            {
              name: 'X-Action',
              value: 'Swap'
            }
          ],
          Anchor: '00000000000000000000000000000004'
        }
      }
    }).toPromise()

    console.log(result)
  })
})
