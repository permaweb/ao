import Arweave from 'arweave';
import fs from 'fs';
import * as path from 'path';
import { JWKInterface } from 'arweave/node/lib/wallet';
import { arrayToHex } from 'smartweave/lib/utils';
import { GQLEdgeInterface } from '../../legacy/gqlResult';
import { LexicographicalInteractionsSorter } from '../../core/modules/impl/LexicographicalInteractionsSorter';

describe('Sequencer', () => {
  const arweave = Arweave.init({
    host: 'arweave.net',
    port: 443,
    protocol: 'https',
    timeout: 60000,
    logging: false
  });

  const baseTime = 1643210931796;
  const sorter = new LexicographicalInteractionsSorter(arweave);
  const wallet = JSON.parse(fs.readFileSync(path.join(__dirname, '/test-wallet.json')).toString());

  function mapSorted(s: GQLEdgeInterface) {
    return `[${s.node.id}] : ${s.node.sortKey}`;
  }

  it('should properly assign sequence for transactions within the same block', async () => {
    const interactions = [
      {
        height: 860512,
        blockId: '-l2bujityzUrM4YI7P_s6zqG1RBmkALSpXdEEd2XOoaErXse94KnNaXGFWVf8jNq',
        wallet: wallet,
        transactionId: 'JTzWaG_tiagnoCNlPpdWvN1r16rw47MbNgZn6Fd1dNk',
        millis: baseTime
      },
      {
        height: 860512,
        blockId: '-l2bujityzUrM4YI7P_s6zqG1RBmkALSpXdEEd2XOoaErXse94KnNaXGFWVf8jNq',
        wallet: wallet,
        transactionId: 'UdFlfj5IUYh-7lHJuLLC94P9M1mqxKhkpuuiMzKUKss',
        millis: baseTime + 1
      },
      {
        height: 860512,
        blockId: '-l2bujityzUrM4YI7P_s6zqG1RBmkALSpXdEEd2XOoaErXse94KnNaXGFWVf8jNq',
        wallet: wallet,
        transactionId: 'cqehSNlOvnqHoRRs56Cex8PEhHsaGYLz1m4j19kWB-0',
        millis: baseTime + 2
      }
    ];

    const transactions = await mapInteractions(interactions);
    const sorted = await sorter.sort(transactions as unknown as GQLEdgeInterface[]);

    expect(sorted.map((s) => mapSorted(s))).toEqual([
      '[JTzWaG_tiagnoCNlPpdWvN1r16rw47MbNgZn6Fd1dNk] : 000000860512,1643210931796,81e1bea09d3262ee36ce8cfdbbb2ce3feb18a717c3020c47d206cb8ecb43b767',
      '[UdFlfj5IUYh-7lHJuLLC94P9M1mqxKhkpuuiMzKUKss] : 000000860512,1643210931797,ba45da3dc691d607f94aa90e5e2121928164b624872f277d708ed807330eb390',
      '[cqehSNlOvnqHoRRs56Cex8PEhHsaGYLz1m4j19kWB-0] : 000000860512,1643210931798,558e456b249d174bc47ca665a3f6162c5ad61e63c12a1a868cc0e18d9e5cb768'
    ]);

    // note that without the "millis" part, the ordering would be:
    // "[cqehSNlOvnqHoRRs56Cex8PEhHsaGYLz1m4j19kWB-0] : 000000860512,558e456b249d174bc47ca665a3f6162c5ad61e63c12a1a868cc0e18d9e5cb768",
    // "[JTzWaG_tiagnoCNlPpdWvN1r16rw47MbNgZn6Fd1dNk] : 000000860512,81e1bea09d3262ee36ce8cfdbbb2ce3feb18a717c3020c47d206cb8ecb43b767",
    // "[UdFlfj5IUYh-7lHJuLLC94P9M1mqxKhkpuuiMzKUKss] : 000000860512,ba45da3dc691d607f94aa90e5e2121928164b624872f277d708ed807330eb390",
  });

  it('should properly assign sequence for transactions from different blocks', async () => {
    const interactions = [
      {
        height: 860511,
        blockId: 'Al2bujityzUrM4YI7P_s6zqG1RBmkALSpXdEEd2XOoaErXse94KnNaXGFWVf8jNq',
        wallet: wallet,
        transactionId: 'ATzWaG_tiagnoCNlPpdWvN1r16rw47MbNgZn6Fd1dNk',
        millis: baseTime
      },
      {
        height: 860511,
        blockId: 'Al2bujityzUrM4YI7P_s6zqG1RBmkALSpXdEEd2XOoaErXse94KnNaXGFWVf8jNq',
        wallet: wallet,
        transactionId: '0dFlfj5IUYh-7lHJuLLC94P9M1mqxKhkpuuiMzKUKss',
        millis: baseTime + 1
      },
      {
        height: 860512,
        blockId: '-l2bujityzUrM4YI7P_s6zqG1RBmkALSpXdEEd2XOoaErXse94KnNaXGFWVf8jNq',
        wallet: wallet,
        transactionId: 'JTzWaG_tiagnoCNlPpdWvN1r16rw47MbNgZn6Fd1dNk',
        millis: baseTime + 2
      },
      {
        height: 860512,
        blockId: '-l2bujityzUrM4YI7P_s6zqG1RBmkALSpXdEEd2XOoaErXse94KnNaXGFWVf8jNq',
        wallet: wallet,
        transactionId: 'UdFlfj5IUYh-7lHJuLLC94P9M1mqxKhkpuuiMzKUKss',
        millis: baseTime + 3
      },
      {
        height: 860512,
        blockId: '-l2bujityzUrM4YI7P_s6zqG1RBmkALSpXdEEd2XOoaErXse94KnNaXGFWVf8jNq',
        wallet: wallet,
        transactionId: 'cqehSNlOvnqHoRRs56Cex8PEhHsaGYLz1m4j19kWB-0',
        millis: baseTime + 4
      },
      {
        height: 860513,
        blockId: 'Bl2bujityzUrM4YI7P_s6zqG1RBmkALSpXdEEd2XOoaErXse94KnNaXGFWVf8jNq',
        wallet: wallet,
        transactionId: 'CdFlfj5IUYh-7lHJuLLC94P9M1mqxKhkpuuiMzKUKss',
        millis: baseTime + 5
      },
      {
        height: 860513,
        blockId: 'Bl2bujityzUrM4YI7P_s6zqG1RBmkALSpXdEEd2XOoaErXse94KnNaXGFWVf8jNq',
        wallet: wallet,
        transactionId: 'DqehSNlOvnqHoRRs56Cex8PEhHsaGYLz1m4j19kWB-0',
        millis: baseTime + 6
      }
    ];

    const transactions = await mapInteractions(interactions);
    const sorted = await sorter.sort(transactions as unknown as GQLEdgeInterface[]);

    expect(sorted.map((s) => mapSorted(s))).toEqual([
      '[ATzWaG_tiagnoCNlPpdWvN1r16rw47MbNgZn6Fd1dNk] : 000000860511,1643210931796,0233bf40009ae4ae32d6125cf5375da8d77cb024a86b26623cf8e9816b4b7a48',
      '[0dFlfj5IUYh-7lHJuLLC94P9M1mqxKhkpuuiMzKUKss] : 000000860511,1643210931797,580a0405284ac42c75c2336c0efac2c5fcd3b379b4f51b7f842a501a704c1038',
      '[JTzWaG_tiagnoCNlPpdWvN1r16rw47MbNgZn6Fd1dNk] : 000000860512,1643210931798,81e1bea09d3262ee36ce8cfdbbb2ce3feb18a717c3020c47d206cb8ecb43b767',
      '[UdFlfj5IUYh-7lHJuLLC94P9M1mqxKhkpuuiMzKUKss] : 000000860512,1643210931799,ba45da3dc691d607f94aa90e5e2121928164b624872f277d708ed807330eb390',
      '[cqehSNlOvnqHoRRs56Cex8PEhHsaGYLz1m4j19kWB-0] : 000000860512,1643210931800,558e456b249d174bc47ca665a3f6162c5ad61e63c12a1a868cc0e18d9e5cb768',
      '[CdFlfj5IUYh-7lHJuLLC94P9M1mqxKhkpuuiMzKUKss] : 000000860513,1643210931801,26844bd597465eae300253dd923bad9db037e15f4f6bd26e1f4a9aac27152f4f',
      '[DqehSNlOvnqHoRRs56Cex8PEhHsaGYLz1m4j19kWB-0] : 000000860513,1643210931802,854d60e74c8c9298dfa72ce9fda56c5e7b40aca41dd47290c5ff17fb3a94e87d'
    ]);
  });

  it('should properly assign sequence for transactions from different origins', async () => {
    const interactions = [
      {
        height: 860511,
        blockId: 'Al2bujityzUrM4YI7P_s6zqG1RBmkALSpXdEEd2XOoaErXse94KnNaXGFWVf8jNq',
        wallet: wallet,
        transactionId: 'ATzWaG_tiagnoCNlPpdWvN1r16rw47MbNgZn6Fd1dNk',
        origin: 'arweave'
      },
      {
        height: 860511,
        blockId: 'Al2bujityzUrM4YI7P_s6zqG1RBmkALSpXdEEd2XOoaErXse94KnNaXGFWVf8jNq',
        wallet: wallet,
        transactionId: 'BdFlfj5IUYh-7lHJuLLC94P9M1mqxKhkpuuiMzKUKss',
        millis: baseTime + 1
      },
      {
        height: 860512,
        blockId: '-l2bujityzUrM4YI7P_s6zqG1RBmkALSpXdEEd2XOoaErXse94KnNaXGFWVf8jNq',
        wallet: wallet,
        transactionId: 'JTzWaG_tiagnoCNlPpdWvN1r16rw47MbNgZn6Fd1dNk',
        millis: baseTime + 2
      },
      {
        height: 860512,
        blockId: '-l2bujityzUrM4YI7P_s6zqG1RBmkALSpXdEEd2XOoaErXse94KnNaXGFWVf8jNq',
        wallet: wallet,
        transactionId: 'UdFlfj5IUYh-7lHJuLLC94P9M1mqxKhkpuuiMzKUKss',
        millis: baseTime + 3
      },
      {
        height: 860512,
        blockId: '-l2bujityzUrM4YI7P_s6zqG1RBmkALSpXdEEd2XOoaErXse94KnNaXGFWVf8jNq',
        wallet: wallet,
        transactionId: 'cqehSNlOvnqHoRRs56Cex8PEhHsaGYLz1m4j19kWB-0',
        origin: 'arweave'
      },
      {
        height: 860513,
        blockId: 'Bl2bujityzUrM4YI7P_s6zqG1RBmkALSpXdEEd2XOoaErXse94KnNaXGFWVf8jNq',
        wallet: wallet,
        transactionId: 'CdFlfj5IUYh-7lHJuLLC94P9M1mqxKhkpuuiMzKUKss',
        origin: 'arweave'
      },
      {
        height: 860513,
        blockId: 'Bl2bujityzUrM4YI7P_s6zqG1RBmkALSpXdEEd2XOoaErXse94KnNaXGFWVf8jNq',
        wallet: wallet,
        transactionId: 'DqehSNlOvnqHoRRs56Cex8PEhHsaGYLz1m4j19kWB-0',
        millis: baseTime + 6
      }
    ];

    const transactions = await mapInteractions(interactions);
    const sorted = await sorter.sort(transactions as unknown as GQLEdgeInterface[]);

    expect(sorted.map((s) => mapSorted(s))).toEqual([
      '[ATzWaG_tiagnoCNlPpdWvN1r16rw47MbNgZn6Fd1dNk] : 000000860511,0000000000000,e2199366ba729c3cb9580b0757858689a66e3435aa7462ffa466eba2b2f8f449',
      '[BdFlfj5IUYh-7lHJuLLC94P9M1mqxKhkpuuiMzKUKss] : 000000860511,1643210931797,ce88782c6a2005ef504ef74223fc864e8cef2aa158cea3dec2266b6871e9aae0',
      '[cqehSNlOvnqHoRRs56Cex8PEhHsaGYLz1m4j19kWB-0] : 000000860512,0000000000000,bb6d3084dd5770a43234e253154fb75cd886b57adf3df52901bf67789247b9b9',
      '[JTzWaG_tiagnoCNlPpdWvN1r16rw47MbNgZn6Fd1dNk] : 000000860512,1643210931798,81e1bea09d3262ee36ce8cfdbbb2ce3feb18a717c3020c47d206cb8ecb43b767',
      '[UdFlfj5IUYh-7lHJuLLC94P9M1mqxKhkpuuiMzKUKss] : 000000860512,1643210931799,ba45da3dc691d607f94aa90e5e2121928164b624872f277d708ed807330eb390',
      '[CdFlfj5IUYh-7lHJuLLC94P9M1mqxKhkpuuiMzKUKss] : 000000860513,0000000000000,12d814fd50a9fabcf334075b3dd5d4e8d4455fb729b6063b092967c99143e084',
      '[DqehSNlOvnqHoRRs56Cex8PEhHsaGYLz1m4j19kWB-0] : 000000860513,1643210931802,854d60e74c8c9298dfa72ce9fda56c5e7b40aca41dd47290c5ff17fb3a94e87d'
    ]);
  });

  async function mapInteractions(interactions: any[]) {
    return await Promise.all(
      interactions.map(async (i) => {
        if (i.origin == 'arweave') {
          return {
            node: {
              id: i.transactionId,
              block: {
                id: i.blockId,
                height: i.height
              }
            }
          };
        } else {
          // note: that's how sequencer would behave
          const sortKey = await createSortKey(arweave, wallet, i.blockId, i.millis, i.transactionId, i.height);

          return {
            node: {
              id: i.transactionId,
              source: 'redstone-sequencer',
              sortKey,
              block: {
                id: i.blockId,
                height: i.height
              }
            }
          };
        }
      })
    );
  }
});

// TODO: c/p from GW code.
async function createSortKey(
  arweave: Arweave,
  jwk: JWKInterface,
  blockId: string,
  mills: number,
  transactionId: string,
  blockHeight: number
) {
  const blockHashBytes = arweave.utils.b64UrlToBuffer(blockId);
  const txIdBytes = arweave.utils.b64UrlToBuffer(transactionId);
  const jwkDBytes = arweave.utils.b64UrlToBuffer(jwk.d as string);
  const concatenated = arweave.utils.concatBuffers([blockHashBytes, txIdBytes, jwkDBytes]);
  const hashed = arrayToHex(await arweave.crypto.hash(concatenated));
  const blockHeightString = `${blockHeight}`.padStart(12, '0');

  return `${blockHeightString},${mills},${hashed}`;
}
