import { describe, test } from 'node:test'
import assert from 'node:assert'

import { groupBy, identity } from 'ramda'

import { determineHostWith, bailoutWith, computeHashSumFromProcessId } from './domain.js'

const HOSTS = ['http://foo.bar', 'http://fizz.buzz']

describe('domain', () => {
  describe('determineHostWith', () => {
    describe('compute or cached', () => {
      test('should deterministically return a valid host', async () => {
        const determineHost = determineHostWith({ hosts: HOSTS })

        assert(await determineHost({ processId: 'process-123', failoverAttempt: 0 }))
        assert.equal(await determineHost({ processId: 'process-123', failoverAttempt: 0 }), await determineHost({ processId: 'process-123', failoverAttempt: 0 }))
      })

      test('should shift the determined host according to failoverAttempt', async () => {
        const determineHost = determineHostWith({ hosts: HOSTS })

        assert.notEqual(await determineHost({ processId: 'process-123', failoverAttempt: 0 }), await determineHost({ processId: 'process-123', failoverAttempt: 1 }))
      })

      test('should return undefined if all hosts have been attempted', async () => {
        const determineHost = determineHostWith({ hosts: HOSTS })
        assert.equal(await determineHost({ processId: 'process-123', failoverAttempt: HOSTS.length }), undefined)
      })
    })

    describe('processToHost', () => {
      test('should redirect to the specific host for the process', async () => {
        const bailout = bailoutWith({ processToHost: { 'process-123': 'https://specific.host' } })

        const determineHost = determineHostWith({ hosts: HOSTS, bailout })
        assert.equal(await determineHost({ processId: 'process-123', failoverAttempt: 0 }), 'https://specific.host')
      })
    })

    describe('ownerToHost', () => {
      test('should bailout if the process owner is mapped to a specific host', async () => {
        const fetchMock = async (url) => {
          assert.equal(url, 'surUrl1/processes/process-123')
          return new Response(JSON.stringify({ owner: { address: 'owner2' } }))
        }

        const bailout = bailoutWith({
          fetch: fetchMock,
          surUrl: 'surUrl1',
          ownerToHost: { owner2: 'https://specific_owner.host' }
        })

        const determineHost = determineHostWith({ hosts: HOSTS, bailout })

        const host = await determineHost({ processId: 'process-123', failoverAttempt: 0 })
        assert.equal(host, 'https://specific_owner.host')
      })

      test('should NOT bailout if the process owner is not mapped to a specific host', async () => {
        const fetchMock = async (url) => {
          assert.equal(url, 'surUrl1/processes/process-123')
          return new Response(JSON.stringify({ owner: { address: 'owner2' } }))
        }

        const bailout = bailoutWith({
          fetch: fetchMock,
          surUrl: 'surUrl1',
          ownerToHost: { notOwner2: 'https://specific_owner.host' }
        })

        const determineHost = determineHostWith({ hosts: HOSTS, bailout })

        const host = await determineHost({ processId: 'process-123', failoverAttempt: 0 })
        assert.ok(host !== 'https://specific_owner.host')
        assert.ok(HOSTS.includes(host))
      })

      test('should NOT bailout if no ownerToHost is provided', async () => {
        const fetchMock = async (url) => {
          assert.equal(url, 'surUrl1/processes/process-123')
          return new Response(JSON.stringify({ owner: { address: 'owner2' } }))
        }

        const determineHostEmptyMapping = determineHostWith({
          hosts: HOSTS,
          bailout: bailoutWith({
            fetch: fetchMock,
            surUrl: 'surUrl1',
            ownerToHost: {}
          })
        })
        const host = await determineHostEmptyMapping({ processId: 'process-123', failoverAttempt: 0 })
        assert.ok(HOSTS.includes(host))

        const determineHostNoMapping = determineHostWith({
          hosts: HOSTS,
          bailout: bailoutWith({
            fetch: fetchMock,
            surUrl: 'surUrl1',
            ownerToHost: undefined
          })
        })
        const host1 = await determineHostNoMapping({ processId: 'process-123', failoverAttempt: 0 })
        assert.ok(HOSTS.includes(host1))
      })
    })

    /**
     * @deprecated - this functionality is subsumed by ownerToHost
     * and will eventually be removed, along with the tests
     */
    describe('subRouter - DEPRECATED', () => {
      test('should redirect to the subrouterUrl', async () => {
        const fetchMock = async (url) => {
          assert.equal(url, 'surUrl1/processes/process-123')
          return new Response(JSON.stringify({ owner: { address: 'owner2' } }))
        }

        const bailout = bailoutWith({
          fetch: fetchMock,
          surUrl: 'surUrl1',
          subrouterUrl: 'subrouterUrl1',
          owners: ['owner1', 'owner2']
        })

        const determineHost = determineHostWith({ hosts: HOSTS, bailout })

        assert(await determineHost({ processId: 'process-123', failoverAttempt: 0 }))
        assert.equal(await determineHost({ processId: 'process-123', failoverAttempt: 0 }), 'subrouterUrl1')
      })

      test('should not redirect to the subrouterUrl', async () => {
        const fetchMock = async (url) => {
          assert.equal(url, 'surUrl1/processes/process-123')
          /**
           * Here the owner does not match any in the list
           * this will cause it to not redirect to the subrouter
           */
          return new Response(JSON.stringify({ owner: { address: 'owner3' } }))
        }

        const bailout = bailoutWith({
          fetch: fetchMock,
          surUrl: 'surUrl1',
          subrouterUrl: 'subrouterUrl1',
          owners: ['owner1', 'owner2']
        })

        const determineHost = determineHostWith({ hosts: HOSTS, bailout })

        assert(await determineHost({ processId: 'process-123', failoverAttempt: 0 }))
        assert.equal(await determineHost({ processId: 'process-123', failoverAttempt: 0 }), 'http://fizz.buzz')
      })
    })
  })

  describe('computeHashSumFromProcessId', () => {
    test('should deterministically return a number', () => {
      const LENGTH = 100
      const sum = computeHashSumFromProcessId({ processId: '0h1DJuO1SBNOR54ZN-rwt0Ztenpv7us1XKDxhLMzYq0', length: LENGTH })
      Array(10).fill(0).map(() => {
        const res = computeHashSumFromProcessId({ processId: '0h1DJuO1SBNOR54ZN-rwt0Ztenpv7us1XKDxhLMzYq0', length: LENGTH })
        assert.equal(typeof res, 'number')
        assert.equal(res, sum)
        assert.ok(res <= LENGTH)
        return res
      })
    })

    test('should roughly evenly distribute hashes across the length', () => {
      const hashes = [
        'SQYxaO7iM_i1eL-3skVf2wLBi0Fhrzv5oy705bEohEs',
        'imUfWfjYqNl5YQfXrZyXMXAoqCK2tHDKtRNfVYfrbJE',
        'oY99yZv42715q5PtNO6XIGrv0n62hqVRPkrKmJAnvHA',
        'E-cwIwZ8OiHINrdRRbcUi340yjfb5l4C_68nNCZj8rU',
        'bJvtIw9Rpve_kIppucUHXgvPB1w-qjIdyej3t3GVXeQ',
        'A3SL7UNithtbszpgzr95SpW4xp3EPVIAW2VUdvfEX5A',
        'NNwi4HfyetuJOd40D2Qsfs0uRLxcTq7JF4VsMrQSgDM',
        '8D2wma3e47meg8Vy0iv1GhwhNem1ofCCrWSi3W1WrrA',
        'P_xy4wfujDL9xPhzRK7-owC1dv-SsjXuepaFDW9xsds',
        'W9V248sB-8W7gjd74UJ48WIgWoq9ViZ-E0sRmGuu85w',
        'QipuAHOxddYxNwmM9HQgP20-3Q4uzwxJutSBomMumuo',
        'AXBJDYT00eTiug_bNmoCDsWxLsX3aX6Ug08Rde-nZCE',
        'B6RQz14DvkH-T0R_Gv2y58DFpCh3n4YDUVHxWZsbfJI',
        'PFUNOHVMfw2l-lP6SgP9xrB8t2uXMWiUGpmndS_NaZg',
        'x0818j0JPITxycJDiVgTuBbCdO-uC0jOVqg_FB6CqPQ',
        'lb0j2XhwHBqQvtVAg2hI04qvt4DIC9N3Kx_PKMXwe60',
        'aHLFnBxLlA9dFzHshOStTmYwHPP-voXeovUoE1F52LE',
        'D3EoAVQZ7gIg0W85M35b0wKyhCCIADXNpHJ5tmU098A',
        'mzj-zVAYEUKuae21QgMlxHnUTzAwEx85Xp8Jv6kWqoU',
        'GY_A6QysQX-fREa7iTXwhkrQEvMcMCPORDFxdo6UJt0',
        'R9gTtVVgKN7vHDk8JmGIsHPlv96SoI0I3xUW3giMKlc',
        'v8uTXOO_wRGLiSSIHRn8pAJOJOMDpWtUUeKsZDt_rEc',
        'U44jJHfe305ba084ZBZ_bAYdJMdoLKLxD2tJsaB5fkU',
        'UoOmEClgGUR50Xso2_t6yzLyIaUMZBsX6-W2C_mms8E',
        'uautItWkT3MxDp8KINC1C2n8BiJbl_MjsP-KwwTmF1Y',
        'uP7ncYs0sHiV4Hwr_6az1uUzGyDn_9yz-7vnqaOcw6Y',
        'PjYA9KW9sZCruQ81_6DOlokEFSRTARdOalKfWxyRhjY',
        'gp5W8lt-2y751fAsN7k9BE6YWIQURIWTpanorL-e67I',
        'bJz9zCag0jHT6VMUKS3TO_IQSjG4PmC65xz9AF3ogdU',
        'tYrogHVHV9gEKtZ7_8CNUaHE3iJsdgbj_RnSsJZA0s0',
        'qFONtqHA1y1ES-qaz3kgzWsuhALJeUF4c_CjyGMazGo',
        'Szrf_MuuVJIyXgWBNdKoWCKUctpl9oqAlFvY201oydw',
        'OrIqTktXw6O4vpnYbXH2wXWQ-wIEM3THVIGOO12pLG8',
        'PiA4Gn85z30mx747KqlbewiEf-KllvwmFdviVrQoziE',
        '8IOMjxzXCfMcx8JoXLf26j7o0h5Ewhz4-fwnJPoiYrQ',
        '2XMwZZC176xjLfdNBr0e8k69P8GItvkiRzwXk02Qc8M',
        '7EcHVEsyLO93aKQElYTwzxG41LIKYhvDZP9cb1oE3dY',
        'p1rbRAM28fFLoolsOklU8Lz3gTDCnRlOriKDXJO3vbk',
        'Be2IokhzrvsyzXqGoz3wsWsUBxZHGwURXPOFHQMdEL4',
        'TW_bF6v5CAiIZZoEcFt08nSnbY1dHmh2__U_xESQSik',
        'u-AFuRyRhkHvYwpHMPB3VHW7jLrqXUYc3JF7X0zBnoQ',
        'hNVMGe5Ya10y2AkmvHZ6Ym-ymCQY_v0xhOluRqdvisI',
        '4w6WQ87hVv3MsVvpEegIG-LAmgOPaSCNs3cFNUipwYk',
        'wKnVWZlwuOHWeljxvOs-X06wci8SVwYmdvByErpwPY4',
        '9hZJlMxRWYAAoHKQALcFj5sVPMyqDsTdRSHlY_lv0Fo',
        'TwznHqosSwj5_ifbhZMPEzOGT6tjYfxqf9heAhx0JiA',
        'zUPA8hDgivudH7W1g6YUWK2XLXTH8taBFsLuUHkUMps',
        'UEVIpYIsevVbNROlxJ8rPlcJ9qgzxR2jjBAOlTdrWhM',
        'Ld5B93p_lVPtK0UDxXAYdFzw07A2I_EwXhtblXaV9lU',
        '0PUiRgR-wDWeR4InEq9THhz3R3QOcuWp2-h_OMk5CBI',
        'pXmjqnN_V0waZkaVyjONhXODLZ9_epLEHIljWVT2awU',
        '1c_-w66psQwSHW8p0hjdIotG5YHs8q0ku0Ki0P6Fn80',
        'L8agkd0XO5J8e7pQ7X6-p8I3XrYdlYey3eAVZH9oTBI',
        'pP7hKAeifkiZ5lacx1jDh56qwnqGgFbMd5Lr9JzlmRY',
        'LAOd7jnzjmtfJzE_RTrAycOgdnXYt2CDgnBjvOS84Do',
        'JO7lDlSHi31xnaYWwj3U7Axa7iB5PmL5yx054Bjh03U',
        'FuQExrsALpL2hOFR5DFcQEW6_7u3h9Vqkr3TZTpO1_A',
        'h0AODcR4bXT61sq6g4z-a56IIYZUUwpna8Rhu842Qh8',
        'qyX-zrfTEBoKUn2TPcM8o0zZD3Jk2i2AF_Dc1s5tiNY',
        'I2zZ6edSs3BjIEOZELXzmeft-GBiySuGh7_KlHVtacY',
        'H3R4Mcvkz5DNAtbASYMEaSvxWd1-K2-0MsOmBmCSndo',
        'EXQErW2vI96PYzQ2NiuKkXVb5nrG8K8dy3tQceBy754',
        'tMUVJE3Z69pXQ9Mz0EV43gKNyyWqe23HqELZ9-vSNuM',
        'PGT2RD7WjoICdlPchiVlTxMh0T4NqhaCaXCf3G5Lwp4',
        '-xO-nooWn_hlxAzlfTVw2KSvI0Rzp0dDj6_P0ZbFfQo',
        'DkRMFTLfGuG07BVELbakfh74N_24chU2BdWRDj6giT8',
        '8pvilwYX0LL-nxfnsPym8zf3vAxtGu1q4GoEiijhYfs',
        'K-olK4EV7bHRPOpZubwCi5AT_wYBUGfIO9iAS9HELks',
        '-yynbxIxNItyXbaYwRJ_FOWMyj5JpUpADQ0k0VLEJEk',
        'YURaQpPQQTdp-gfiBlPI8zK2ba20ReiEocAexa4r81M',
        '5QByYaQmAL5A8B-XKcZ7qJHkrKA_9Vu03P7YVcBPZMY',
        'jrWp8O87XdmPe1amCILe3f6gDQr4wLeWgmjzOAwx-Vw',
        '5fr2tMWy0AXrugNLwHfRtEQ1gfT8PrtyJiG0W5RzvBg',
        'uwfXk7JUXrai5RWfCbmUeh0rdZ6Pzv7unKXmwZ_T9Ow',
        '2AVy5DPV6-Eb87oVT6L6tmndGRPIBnN_txAY9WneIgc',
        'd-2aX7LyUHOW8fHHbgz4Cfar0kqNrK9FnPp7f7Bi9ys',
        'cvQscQ8uxwCCt8EMUtKMii3v4UOn6eAylln-ET7Pd0U',
        'x1W3gRPUK29bGqAkWyAlMbsVm-X8_nvXrT58AzJwLNg',
        'v_Lcxx6K3317EGkzejBFZu7Xn-jpCtFhg08-Nk6fF9w',
        'lDzWiyA3cG9zMb0JsuMyIPVc2VxFIUZIgHGFaCY9eDo',
        'geIbyXwg6xVNS8dFHMJRQ1BJxvC9PfHLA7slpbthwJo',
        'lH8WjUij67aC9Ij--Y2-vnMBuNbxnEgu3XQzhfJ4zp4',
        'bUhxxaq8iL-ntzTfsg44irIg5hoJpC9UHvL0GhP-gcw',
        'Q-BNKibG3y0-cZdQbXWIMlsTijxeDx2qr04Q4WBPigE',
        'ltek4tb3xWgw9qGPhkXPE0nSIpzumyUmC_BPL5cXUu4',
        'Ry4yQhVQcQiCrE_648IVgqVotGzuDXFVfRhHukYzwas',
        '0KkYSA9lBFjZ9LnuS64KgJDGSrHKleKO9lxHStNOoMA',
        'n7w80fh7VEINddY9bStM5dUinpwUqGsTS_UruCbZsfM',
        'aLNATKoWy4UFNPJ0aFtSBhhe5LbiOwL-VH0NfAIQIjU',
        'jzOSCJort7GQQUQTXLzGdy9UbJtAdhVMn35ekZWar9Y',
        'X4eYP4WxaGM8DJkxbxBRPUt7kVI4VpfJkAA2sjqmkD0',
        'ecRB3SHcP1jn--hqaOtVg6nraXXKGb0LVZgyXVe2xuA',
        'ErhrRdKp7XGbdGq-G7RUB7XjAOeSzidCVlGROlWZUi0',
        'vuDVDhieQSMyuZghTEFZ9ENk-HipBtAF3M6_BT6w-7w',
        'KqtR0O09N89MxtWwAPWs7Pv5jsFFSLChmURKFTL7g_Q',
        '0c1qE8TLuP2yZxUiRX36ttF5M-vB8JdzyjHGaGqTE9k',
        'mzZ7lSkIVj7WVQoymEVYFwxlmId8-vA_KU1yulciOVY',
        'DiN0iHDi0THHLx373Yu-QMba59OGOoS2FHn86kSlXmA',
        'W3MtYcP56FmPBJCWDYZIE3LAjzpspkqhxRV9zM6bh1c',
        'eoDCw_goQaA1XjwrlhARhOFQXpJKsUTCXqZKnktmE8I',
        '41u4eCHukPEDPCd5sR760xFlJrs_IBaIRPRFwtTCvOA',
        'FIbOCjBej7HpQ-pAzcA168YR1PI2N5_ohwWlPghVO6A',
        '2YsZfRmO0GEfvSP4TyH4PKe3FkBbK0sy1IY4PlaxjdA',
        'tn-n6Z5D1sTsW_zmjZ_GiuD5keL6QIUgjRRSHfLAweE',
        'xrqJox1D7ti3ky0ovPoGvw3ycTlTIbiL77W4CR_Eqio',
        'moeNGJORS0pbG2Sg46I8F-S8xO-3kbwlZAG1KnQx1so',
        'g10HtWhB5zvtOrvw1PJOPYOTxYxPJI9F95pDoXk46kU',
        'bG7wCwKipsRZsNfyPYFlZq2cll7jXOACGKUIHNoKXyg',
        'lDNPiVyEY6bHDbl-dgKlDZr18WwgaJzcU2DYm91F4oE',
        'W4tL4nE-nWvR-xvjYKbckobDcVVLFvUCnhTIkXt4yKI',
        'L-exoEAiSzDL4eQWojgAIfp3gNOlQ6teYH7vs1KdRM0',
        'AE9UQJOvGbeLeKgOG8vWAOex42w-_SawU7tZ5HGx-O8',
        'h0uTTjjj40dK3QvOI_BrBcleUmZdlT07pQsmx__SlZg',
        'VLoX_fNy5XT66RwbscP4aYLoAxn23yIv1Zg2Q5zINnc',
        'cSom4wHfXJe45jaQWe_6JRuOLOFirFh6LsFoHedCpts',
        '5ieFN983FWHBKLcDC2lDGQqVnqCcBKr6tV9mvc7RvE0',
        'l6ErUgIxXPLzkihguVvHwFrxMsM3815NHGIFSSF0eeo',
        'cXagtcOzvSP7eKr_OpKYKIa1RaYSSHLAcnisfpvrsEU',
        'zDU8-2Gh2g2HDH6NWxXxPj-XW252eAIFh9YgJjcEOZI',
        't8jvhZWUPTGsys9FnetpVD9wn5T_UackM6xFG07s0NQ',
        'CMJ6IwTRBRPrKxybabNXpaC7BhPmMIf89gR5D0X6o-c',
        'Lj3AmepCpvytAi589wlnXrHF72hniWw4dSJZFfZJBh0',
        'NN33jNDUOqklzWNPLCj_VTGpIlPllJv2Np-FZiznX10',
        'mFy4dUEAmcKJP__Wd-GpiZQLq4CijdayixhLPQrk7RY',
        'DogNMoZIIBTw1um_iqQWsdMyWxTT8_THtVJdPLYKCvk',
        '0yRjpptUfWsfyDSIegGxD58qgz0hIsEUCLKUctUjF1s',
        '9tyUDSpU8Tbi-G85XyfD0VXHtLhQ0H3ra1aDNtaji0k',
        'kv3AIxe_VDbGO3FX98sooNuOSY_WznEfysIphNOOEQ4',
        'CN3Z29WYNiruuGD6tPRRJHPk9mhbPlwHinrhUnCHCRo',
        'Bs2_4EZi9ZeAPF4EfTMzd3WLz33bpR6XitoaplRgUWM',
        'v74L6oydQ-IDuQZwlz5ljsYh-WBhwxX8gOpzJupMZqk',
        '7hVoNhus_5hG0LnhZJpwO9yOD3AOPEEWJb6xkWzPBRU',
        'iOOshd6H6tdxIS60iy1QDs0v0I5IehcBVEx5SvvrZaA',
        'iuOIomAsgdgd3llxTwFEfqn8O88J1xf86RlIl_UTdpU',
        'jpvJkou7XE82W_c7c-JS0fd5tRUtMsg-w8CQQxeCRWc',
        'WMPxiDmUQkRzdpeQhp3k6IEVmCdQhApjSViKnBprh1Q',
        'batVpOBAJRi1ccEG7TBCWj_9AkhjObxlP0HRLyjI5Hg',
        'jzKYoVRk8ZJgMsDDxnBC8v3v9yPcTCEmEBKveLNSKHY',
        'TmIUWssF_8HCMK1Kg3j9lz2FtDV53mp0eU_Ov9D_ndY',
        'jxjmcghCPgbIpIZL7Z5bc-IueIlCNZz6226jKCFDAbg',
        'JN6FoONWYLQHmck1SjhAOnW6wKC63LjclB1WQ_Y4X1o',
        'bBMFERegIloYJVoGtU27CC4g-3Iz9Wv0CEfsD194c9c',
        'UxXLujWhjsDfaBT7x3HHVPjSws0SiQLXKBlP4RVC5EI',
        'v2VDFt8dnSC02qxCW6DmcnrWEq_wv81HisFl2p_j89c',
        'KjDeE93BFoYM04q9p-C5bATRiFz3JjXLQJI50_d5QaA',
        'b3NpsEZr9JWa2jAp--KbVt3FPDDpFm2K4KSSLJ4GtIk',
        '0H9WocNfJJVJfOoc9SAtVIsHGGiWdP-YNMfHX7eBvgU',
        'CkvfdJES_7DJ1HBe92qENjypZDRUPWUsljCGkLbmUvo',
        'RNStAnmu79xuj9lbvdURyiihTGyGcrDDjp2Sw8b988k',
        '8teJTYfoQZYMeAO0c14nEE878as22eXlEVB7Az5lKlc',
        '3-9DSEGRKTpeb0A7nGYhpzdVb8AewVhTDU7XRsyJEIU',
        'T4BJ469gPV6hivL_N6aE_50TaIG_TgGZ5RdS9xe-usU',
        'xyQmviYOqluF_Nt7BHRhBHGC7B37pbdsOwM9gGWYIhc',
        'cBKZd7hKhM1z3pAocpCloeabom3YkicKj7FdGkWtglc',
        'wIGt23xSqTFOFlPryZ4xwbOIgNUjPJ_rFSzA9iSTkKw',
        'mBhoWW_1FDVM3gN6iBnrIRTcAWHUrjSmlx1wwDNy1-4',
        'Yfk6KkqxOKFytfa6hzLROOEhhiIv85tUE20Ut1FcLMM',
        '7EVoEq9cOFfxZrdIoPMrcT4my9e3j49PDixTlBKEGJI',
        'kYxxTu-FV3GbNMG4Zod7MKUWMWuh5VZ8-WPk8djMh14',
        'unkplbFXUyDo80F3bPScFPjxGW9wZ3an7CpjuVp2TaQ',
        '6ZRKUl4OxMS01oFglN7nJbQLg6ULNGGJKPHx8aw39Es',
        'uaNC63pcWQ2m5qDxBgVHOXR4ZNUl8hgvZjh78wf6zQU',
        'akRDxm1jKKIybRk97H0fL_KL7xD0siaTFsu_bAKNUEI',
        'YaQvCn8sjS87xp_dzriBcwK8LP29vT3tFxW_M0Cv82E',
        'UpAl1Nl54N18iMfn0lynlvTI_Es7J_983SXoW_fwRTI',
        'GEitJpJD60Ll9TIIBNbtfX3QVk1qN3Jre8rZQvNKu6o',
        'vDCJd458zh3_Fotd69jrcZhmIwmQ6qUaHqX0RbPwuFI',
        'Ojs2cn7i_Ed6ptcloxDYAqHNLnUsBP-vy5An5a8L0AM',
        'hNedUXe_sVOWg3751NPXpYSKwdU4ck43JLkU15SkmS0',
        'RhjQqV0njiw-zkhCgYDnDr7Zvkg2b5gtOqnasAMm-uA',
        '6KircazJlktWhLAIDJnwsKmMeVE-kNgzJc3l4mGahHk',
        'gn7ihvR73CKYP_qCalrWIZSc7F6q2rfV8fDHkolUQzA',
        'bgyIvzWZ4G7ailclkep9pfceXieBIgz5FRMmPW3DeCk',
        'BcbMGUxPlsa6jofNG2yZaroagtsbfJWqwG0d-BjnS9E',
        'I0BoXGTKPdv9A6_huEUB-4AB2o974K2h-MSkIdY8iQY',
        'jtrWowojBWLF8rObSPDRZhIk6F4qbPqLxn-Sz2RMYMM',
        'z91jod8HYuN1BlSF8ISF4KpiPmmvjB--Ba0el6iWBIM',
        'F33TVdp5Saybpdbem-l-GAO0naCCVUKQYH0aEw7YYEc',
        'mYbm9rCbE6f6fkBmTAf1ZL7mxCneCroYipgbcxww6H8',
        'o0XZPCiKE0xXD3aNH9ynv9oOjnaH9dJMnmYk_wWuUyk',
        'yXQkJfg0_qPc4bdssQ9GRbo0TpEGG4C60_jcpMMh2vY',
        'vit-qBn3LSXoxtvWXE0PLf7Fti8XPJGBQve4UIb-NhE',
        'wEUROwSxdwhEy5GDkEZT3b7kc6f5QUCuN6XHAqXnRf0',
        'c7Sm1mhAhnbEA5Gac8JWjm5nBdo95QSqo-i1qeWgLnM',
        'UIi20hpQoou5BBD9YnaGfWROt3SO2TsaPl8Rohnb550',
        '7tJ7-9xoxWw0sV9MGTyJI8qfGgHzttrTfZdifm035ag',
        'd9nOlNHWA5gCQEWJOHe6iuYLD-o2nZ6WIVLImse9UYY',
        '4INMchajecxVD7vfj7t76ad-ZZHf9O1-Va0TgxOWOYM',
        'ffNPjJZ_3UcbPzLVWiTeqncoPU3p1pAVE_9zfSPN9uY',
        'Q4aTlIxLpXYyWqAx7LFO0Pe_yh3DqMjqBW2LyFawg0o',
        '5lqk5HLiJQyqNVe75MbO-hOAjLvWmwAlYjSgO-cO6IE',
        'qqut2dcrpLsv-4kYphnIcu9dC3stKYXKpDjIhjccr7Q',
        'UgqjEApcb7eV5UAziQiMqA6etuQCZ0sJofMvmE72098',
        'g6sBs8wyZ4vXXCy5ZJUr8MQsdKlsnqXZTHKgQhhiMVM',
        'RnWyC3sfNUlL-RKr4rr3V3olYCkgIes7d1oIeQQVpe8',
        'L2eV_EW1YiZNbTIT5PkTpNzZTxl_0c5quMgk7DLbYPE',
        'GhRoboDF5ntQX1p3aWAnUlTVyH5iHue9fnT7PBLy9UQ',
        '9gpysJc-mBUVvxyCQWFD3sSeR_StiOQDjrK1ekCHsO8',
        'ezC-4m99E7wmuURJJ75tFEubWhE8pQ1qgMEKFn8YZWs',
        'txQBtHUVoNImb8MpttcDPXqg1fOSFqEm05JXJ51lZn0',
        'Q4sJo_D8Tb9Iv7_tqzfXxM9fS6EQyAUftQLv6ZDY9XA',
        'q2QpdpMUSc9M_y0-y2G9NtR6U2k_JZYh8h1Tamw5WNQ',
        'ILX48su-yE2qdQY5GCjOrU6wy8TAGMvTAfJQZNFPanI',
        '1D7fXt_bcgr5QhF1icTPf3EiuaS_JGfH63cT5GJEris'
      ]

      const res = Object.values(
        groupBy(
          identity,
          hashes.map(h => computeHashSumFromProcessId({ processId: h, length: 10 }))
        )
      ).map(a => a.length)

      // TODO: anyway that we can assert that these values are "roughly even"?
      console.log(res)
    })
  })
})
