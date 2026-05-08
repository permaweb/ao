import { describe, test, before } from 'node:test'
import * as assert from 'node:assert'

import AOCore, { createSigner } from '@permaweb/ao-core-libs'
import * as CoreClient from './ao-core.js'

const WALLET = {
  kty: 'RSA',
  n: 'x5wjDziDSmSCvrWTiWk4avD-2DmolJHV6FOqwX8Dv4qvAJUDLq8kGg4r5NGj6yWS_f1N58FyhuAKcNgwBBj5Api5Kx5siL3vvcGywUaIID4wSn0BBjiTOf-IyEp0Ch4esGcf5fxNTzhX5X_2V8uPeXCGI-fbm877swOtgDSPc-ICAbML_CI0lOE60IP-KuWG7N0nsfibfDKs5fDv-JJTl21Dzxdryq44O873Kuyg9uOYIBW454UyBAYNMlSoMO753oLJvQvKi5n5X3ldnexD9bAwSzrjx1uhmtEr98ffxuplwsu0RkBOfolZS7GrD1mA_9zWKba-rreTus69gvbjSnHcQOkn6w11mGlL0_v95CN4kmthxlhuxPQS2R1pdkNYiX9IuULZcet-CO9Cnm6YDsNyvc84ly-iniUUR9Op2DWLzMuwNz9V-qJioKmGWmVE8V3tcu8RheAXnc2EoNwp3nhwV9a0GTcmrH7Dbpk-i60x75raxAYi5w_NAp44jddxueyxthW-3uyQmVtq_t-j1lMmrInTtRoIXi84bfZYzsxDqzx4E56xB2I7wQcOg2JSzLNVmzo6x2gVUSb9K2yCoIgM55eTdSS7sFG_fT60ftvR-RJR4fOpMHbMA8-aOcs6CLgKxFaVrVEWcSKpodKl_wjXXYJnPZE-xrXRyVwtx-c',
  e: 'AQAB',
  d: 'QMVnkv7Ri4hF7MBa2ZHtHraI230KOPuBn9vWYudmPfcwhk3UNIfcfR_wGlX0jM8qfYR-jR92nFGC0c809X9s_ey02UsMCOspKjf6W0EZ1uyXGvSpKm2dSIqkxely8f2IE9HCxgwywewUiYIWW7LQIaXjwS7xUgO-JP6ihCGKEx5ZbFe_IdevnEfhn9vU0_Ka761rvhJf0dNXy119YPmKam6oPEDrV19lG_MyvRj_ul1r9a1WzLmp2yhji9twoEBLkGp8L_3tgZM7GkH1oNMT0luTsDWxx_Tx4ZzSWZrgAFn7H1SecNVZIzJKaYeDbH2soFn2nJ6SDXvAUjPXxvF6GxCBp5I40mSaQW8CppI-ZWw1dbxMRjv2IQHAxsMN_TM-vk0YmjrzOr5SVWkZ3Eib6nor8kP9g0fdsA7Wlhocop8JhjdQ7XDxm0n-VLg75Wnk0o4hnmvYq5jnJg5k6mE0mBQ15mBgC8MhPZTb9VLySl_CXsXzLdT0UuOKpDGbHiWdVjT3Yo_afZt75vzQ0ys1Y5AILlFlibRyVOLnT2YE6906U3DkQLWYTs6XGWiYYS7rDPnZc24xhTj3WtCubINBOCfbcU558klgxM2Mp-TbFvLu0WPy-neeMopCsLbf-sBjWSdGE3RNSV9IuJWV4rQ2XEvtz4xS_E5-9BGw3IW-eaE',
  p: '-3KdF6fI22lJ9Kv0HPMJmB4I3KgHgSpnkx99MirabiEFq3Trd5B_6iIeaCz3IKaPMvpujRTmJatNLaw2KNhtETaHQqJhw-_X82CJaYVJSFrmjnltD7dUIJW3LLokq4F7YiObd_oGWb75YKLx8WobX7E4BJd-8Bbcz2LsReYBLim6KKzzQPIw-uXfMcF_pnWA7W7S5JSBKtp458Mo6MYITlv4iAhU5cgXvZiURa57I7woTuSgl9Pmzn_ZR83tbmXK6EJA5J2nzavUgUTOaBmCkNGWztDvsb3XUwtcW48RQgDoHP6dlS4ZX7qBt5shvkDADj4Rc-X-V0pbqkWLCLKRvw',
  q: 'yzlFM4JXVpBEO2s_2fmMDKGP6p-d2pv3M54-hjBHyvYOy8Zs_WrrlRm12zDXvV1YfOpHswKk3SxO9jgTAdHd_QPnXTKpO15IriuKhODPK9zRsM1pEm2tskfdv-KsE2TKULVWxBsS_sMn4pGFgTFIrE4aXezvnWBU_DBO31lRWnBHxflCJ3zl68YxNbn3Er--R4GBpyBle500-tiONDYh4eoY_TKlG3b6x4x4n1u5qz2WGr1VKhUro5GFvTj0WRlZvYGXMfIoTqu5dEApMsfRPq1qAcWU-tzy6FF1nwjypkgbr8lCcDYhNr64eRyCUUuArcVi84iIzxD3KNx2S6UD2Q',
  dp: '1f1ej-ks2P2sANvuLkzvl1PIOvGNIXHTH7QmufEaX6sexiIE2oZRNhK_Se0qi9D0AXB7cPmeO-SjFAGBPhWiDIoZZq4HAdc2M1uu1eymxzsFB69zD3L315tSfnAUERlqxcSD5QEVMn-Cf6lsugWRMkkB4XaEgxMR7DTF2165Fm5QjZlSk60J3hyPbCq-1g0eIfK06-8uVigDyUmfoSoXm4hN5IciqUM2YRZe6UZqaakRrMKJoWym-op3gdJRBCkBG9R2oZlCW5imizThbFp5cYHNFElgFCX6ACSk_w6soz1eTH6r4W-QDJYPGxCdEOrOB9DuzXGomOUhSbFRd59wxQ',
  dq: 'GmasSM7MDeDcHGQIfYbf3Nw4WCC4XygX60rJkKFBEmr47RwwGJQFWu9mIr2rqVwxHLlK60SSqnERKQeL4JalIjOZoQ_t0FqlUosxiaWzBF3BmBh3Z_97q0eO1VjbRgG4DtggF4X058furI5_K5N9f3T-E-muD2HuaHzWIkn2OauQh3WkVIDzVbf_uJ0aLgNe8ucuMsoQpQh9U4FCqCHIMRM6f9pOfMzuM3JaUUmXS1nK4Fpsb_UkIDHNkBGQHOsgL3BgdgqhlebVRvb24zP2SRA6T1Sd0CFYJTo_75M4AsYnYqTgzrcZhYUtbf54J5uJcgnMmxrHuy7XDSXm8FjVsQ',
  qi: 'HJhf2ZP_PczoOoEMAw3cN6wdrZLG9J465tDjZ4HYqL9vrzPs7fPrXWJo4-WA-p_2IDXCkMP_t6H6JFyK1xHmDmjNpP7XlTwBb_hcEgn0W3dvmZ597Ey-B38IZfn0J4Wq3s34kcq3tprB5rG08qTm4d_tG-sln8Z7Ey-bLKTWPL_kIqpTCJ0H7cGvFVRMGN2dc9nPb4MYFRXhxZS7JF4SQJyRwPuHEMsY97Ph2IpNYpxKTGR1LfqWwSwnwrfyY_Y8sgkHMSNDvZcdGmaEYxhzTXa9xFGUdEFn2IAUIdvVz0aCBqC0soyfrkF955SDbCkbD2QxhyLX1DBVBcw_HEUCRA'
}

const url = process.argv[2] || 'http://localhost:8734';
const scheduler = 'mYJTM8VpIibDLuyGLQTcbcPy-LeOY48qzECADTUYfWc';
const module = 'ISShJH1ij-hPPt9St5UFFr_8Ys3Kj5cyg7zrMGt7H9s';

console.log(`[AO Connect Client] Testing on URL: ${url}`);

const createConnectDeps = (signer) => ({
  aoCore: AOCore.init({ signer, url }),
  url,
  scheduler
})

const createCoreClients = (connectDeps) => ({
  coreRequest: CoreClient.requestWith(connectDeps),
  coreSpawn: CoreClient.spawnWith(connectDeps),
  coreMessage: CoreClient.messageWith(connectDeps),
  coreResult: CoreClient.resultWith(connectDeps),
  coreResults: CoreClient.resultsWith(connectDeps),
  coreDryrun: CoreClient.dryrunWith(connectDeps)
})

const rsaConnectDeps = createConnectDeps(createSigner(WALLET))

function logError(message) {
  console.error('\x1b[31m%s\x1b[0m', `Error (${message})`);
}

async function createEthSigner() {
	try {
		const { EthereumSigner } = await import('@dha-team/arbundles');
		// Use a test private key (DO NOT use in production)
		const testPrivateKey = '37929fc21ab44ace162318acbbf4d24a41270b2aee18fd1cfb22e3fc3f4b4024';
		const ethSigner = new EthereumSigner(testPrivateKey);
		const publicKey = Buffer.from(ethSigner.publicKey);
		const signerAddress = publicKey.toString('base64url');

		// Wrap the arbundles signer to match ao-core-libs signer interface
		return async (create, kind) => {
			if (kind === 'ans104') {
				// For ANS-104 signing, we need to call create and then sign
				const deepHash = await create({
					type: ethSigner.signatureType,
					publicKey,
					alg: 'ethereum',
				});

				const signature = await ethSigner.sign(deepHash);

				return {
					signature: Buffer.from(signature),
					address: signerAddress,
				};
			} else if (kind === 'httpsig') {
				// For HTTP signature signing
				const signatureBase = await create({
					type: ethSigner.signatureType,
					publicKey,
					alg: 'ethereum',
				});

				const signature = await ethSigner.sign(signatureBase);

				return {
					signature: Buffer.from(signature),
					address: signerAddress,
				};
			}
			throw new Error(`Unknown signer kind: ${kind}`);
		};
	} catch (e) {
		logError('Failed to create Ethereum signer: ' + e.message);
		return null;
	}
}

async function createEthConnectDeps() {
  const ethSigner = await createEthSigner()
  assert.ok(ethSigner, 'Ethereum signer should be available')

  return createConnectDeps(ethSigner)
}

describe('ao-core ethereum signer', () => {
  describe('request', () => {
    test('send an HTTP-SIG GET with an Ethereum signer', async () => {
      const ethRequest = CoreClient.requestWith(await createEthConnectDeps())
      const response = await ethRequest({
        path: '~meta@1.0/info/address',
        method: 'GET',
        'signing-format': 'httpsig'
      })

      assert.equal(response.status, 200)
      assert.equal(typeof await response.text(), 'string')
    }, { timeout: 30_000 })
  })
})

function sharedProcessSuite(name, getConnectDeps) {
  describe(`ao-core (${name} shared process)`, () => {
    let processId
    let coreRequest
    let coreSpawn
    let coreMessage
    let coreResult
    let coreResults
    let coreDryrun

    before(async () => {
      const clients = createCoreClients(await getConnectDeps())

      coreRequest = clients.coreRequest
      coreSpawn = clients.coreSpawn
      coreMessage = clients.coreMessage
      coreResult = clients.coreResult
      coreResults = clients.coreResults
      coreDryrun = clients.coreDryrun

      processId = await coreSpawn({
        module: module,
        tags: [{ name: 'Name', value: Date.now().toString() }]
      })
      console.log(`[${name}] Spawned shared process: ${processId}`)
    }, { timeout: 30_000 })

    describe('spawn', () => {
      test('spawn a process with ao-core', () => {
        assert.equal(typeof processId, 'string')
      })
    })

    describe('request', () => {
      test('send a request with ao-core', async () => {
        console.log(`[${name}] Using shared process (${processId})...`)
        const response = await coreRequest({
          path: `/${processId}/slot/current`,
          method: 'POST',
          'signing-format': 'ans104',
          'accept-bundle': 'true',
          'accept-codec': 'httpsig@1.0'
        })

        const currentSlot = await response.text();
        assert.ok(Number.isFinite(Number(currentSlot)), 'currentSlot should be a number')
      }, { timeout: 30_000 })
    })

    describe('message', () => {
      test('send a message with ao-core', async () => {
        console.log(`[${name}] Using shared process (${processId})...`)
        const result = await coreMessage({
          process: processId,
          tags: [{ name: 'Action', value: 'Eval' }, { name: 'Time', value: Date.now().toString() }],
          data: 'require(\'.process\')._version'
        })
        assert.equal(typeof result, 'number')
      }, { timeout: 30_000 })
    })

    describe('message - full response', () => {
      test('send a message with ao-core (full response)', async () => {
        console.log(`[${name}] Using shared process (${processId})...`)
        const result = await coreMessage({
          process: processId,
          tags: [{ name: 'Action', value: 'Eval' }, { name: 'Time', value: Date.now().toString() }],
          data: 'require(\'.process\')._version',
          opts: { fullResponse: true }
        })
        assert.strictEqual(result.Messages.length, 0)
      }, { timeout: 30_000 })
    })

    describe('result', () => {
      test('get the result of an ao-core message', async () => {
        console.log(`[${name}] Using shared process (${processId})...`)
        const message = await coreMessage({
          process: processId,
          tags: [{ name: 'Action', value: 'Eval' }, { name: 'Time', value: Date.now().toString() }],
          data: 'require(\'.process\')._version'
        })

        const result = await coreResult({
          process: processId,
          message
        })
        assert.strictEqual(result.Messages.length, 0)
      }, { timeout: 30_000 })
    })

    describe('results', () => {
      test('get the results of the shared process', async () => {
        console.log(`[${name}] Using shared process (${processId})...`)
        await coreResults({ process: processId })
      }, { timeout: 30_000 })
    })

    describe('spawn and message (fresh)', () => {
      test('spawn and send a message with ao-core (fresh process for this test)', async () => {
        const freshProcessId = await coreSpawn({
          module: module,
          tags: [{ name: 'Name', value: Date.now().toString() }]
        })

        console.log(`[${name}] Fresh process ID: ${freshProcessId}`)
        assert.equal(typeof freshProcessId, 'string')

        const message = await coreMessage({
          process: freshProcessId,
          tags: [{ name: 'Action', value: 'Eval' }, { name: 'Time', value: Date.now().toString() }],
          data: 'require(\'.process\')._version'
        })

        assert.equal(typeof message, 'number')
      }, { timeout: 30_000 })
    })

    describe('spawn, add handlers, dryrun', () => {
      test('spawn, add handlers, dryrun', async () => {
        const freshProcessId = await coreSpawn({
          module: module,
          tags: [{ name: 'Name', value: Date.now().toString() }]
        })

        console.log(`[${name}] Fresh process ID: ${freshProcessId}`)
        assert.equal(typeof freshProcessId, 'string')

        const message = await coreMessage({
          process: freshProcessId,
          tags: [{ name: 'Action', value: 'Eval' }, { name: 'Time', value: Date.now().toString() }],
          data: `
                Handlers.add('Info', 'Info', function(msg)
                    ao.send({
                        Target = msg.From,
                        Data = require('json').encode({ Hello = 'World' })
                    })
                    ao.send({
                        Target = msg.From,
                        Data = require('json').encode({ Hello = 'World 2' })
                    })
                end)
                `
        })
        assert.equal(typeof message, 'number')

        const dryrun = await coreDryrun({
          process: freshProcessId,
          tags: [{ name: 'Action', value: 'Info' }, { name: 'Test', value: 'Value' }, { name: 'Time', value: Date.now().toString() }]
        })
        assert.equal(dryrun.Messages.length, 2)
        assert.equal(dryrun.Messages[0].Data, '{"Hello":"World"}')
        assert.equal(dryrun.Messages[1].Data, '{"Hello":"World 2"}')
      }, { timeout: 30_000 })
    })
  })
}

sharedProcessSuite('RSA signer', () => rsaConnectDeps)
sharedProcessSuite('Ethereum signer', createEthConnectDeps)
