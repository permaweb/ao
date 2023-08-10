import { CustomSignature, Signature } from '../../contract/Signature';
import { defaultCacheOptions, WarpFactory } from '../../core/WarpFactory';

describe('Wallet', () => {
  const sampleFunction = async () => {
    setTimeout(() => {
      //test
    }, 1000);
  };

  const signingFunction = `async (tx) => {await this.warp.arweave.transactions.sign(tx, walletOrSignature);}`.replace(
    /\s+/g,
    ''
  );

  describe('in local environment', () => {
    const warp = WarpFactory.forLocal();

    it(`should set correct signature for 'use_wallet'`, () => {
      const sut = new Signature(warp, 'use_wallet');
      expect(sut.signer.toString().replace(/\s+/g, '')).toEqual(signingFunction);
      expect(sut.type).toStrictEqual('arweave');
    });

    it(`should set correct signature for jwk`, () => {
      const sut = new Signature(warp, {
        kty: '',
        e: '',
        n: ''
      });

      expect(sut.signer.toString().replace(/\s+/g, '')).toEqual(signingFunction);
      expect(sut.type).toStrictEqual('arweave');
    });

    it(`should set correct signature for custom signing function and arweave signature type`, () => {
      const sut = new Signature(warp, { signer: sampleFunction, type: 'arweave' });

      expect(sut.signer.toString().replace(/\s+/g, '')).toEqual(sampleFunction.toString().replace(/\s+/g, ''));
      expect(sut.type).toEqual('arweave');
    });

    it(`should throw for custom signing function and ethereum signature type`, () => {
      expect(() => {
        new Signature(warp, { signer: sampleFunction, type: 'ethereum' });
      }).toThrow(`Unable to use signing function with signature of type: ethereum.`);
    });
  });

  describe('in testnet environment', () => {
    const warp = WarpFactory.forTestnet();

    it(`should set correct signature for 'use_wallet'`, () => {
      const sut = new Signature(warp, 'use_wallet');

      expect(sut.signer.toString().replace(/\s+/g, '')).toEqual(signingFunction);
      expect(sut.type).toStrictEqual('arweave');
    });

    it(`should set correct signature for jwk`, () => {
      const sut = new Signature(warp, {
        kty: '',
        e: '',
        n: ''
      });

      expect(sut.signer.toString().replace(/\s+/g, '')).toEqual(signingFunction);
      expect(sut.type).toStrictEqual('arweave');
    });

    it(`should throw for custom signing function and arweave signature type`, () => {
      expect(() => {
        new Signature(warp, { signer: sampleFunction, type: 'arweave' });
      }).toThrow(`Unable to use signing function when bundling is enabled.`);
    });
  });

  describe('in testnet environment when gw url set to arweave', () => {
    const warp = WarpFactory.forTestnet(defaultCacheOptions, true);

    it(`should set correct signature for custom signing function and arweave signature type`, () => {
      const sut = new Signature(warp, { signer: sampleFunction, type: 'arweave' });
      expect(sut.signer).toEqual(sampleFunction);
      expect(sut.type).toEqual('arweave');
    });
  });

  describe('in mainnet environment when bundling is disabled', () => {
    const warp = WarpFactory.forMainnet(defaultCacheOptions, true);

    it(`should set correct signature for 'use_wallet'`, () => {
      const sut = new Signature(warp, 'use_wallet');
      expect(sut.signer.toString().replace(/\s+/g, '')).toEqual(signingFunction);
      expect(sut.type).toStrictEqual('arweave');
    });

    it(`should set correct signature for jwk`, () => {
      const sut = new Signature(warp, {
        kty: '',
        e: '',
        n: ''
      });

      expect(sut.signer.toString().replace(/\s+/g, '')).toEqual(signingFunction);
      expect(sut.type).toStrictEqual('arweave');
    });

    it(`should set correct signature for custom signing function and arweave signature type`, () => {
      const sut = new Signature(warp, { signer: sampleFunction, type: 'arweave' });
      expect(sut.signer.toString().replace(/\s+/g, '')).toEqual(sampleFunction.toString().replace(/\s+/g, ''));
      expect(sut.type).toEqual('arweave');
    });

    it(`should throw for custom signing function and ethereum signature type`, () => {
      expect(() => {
        const sut = new Signature(warp, { signer: sampleFunction, type: 'ethereum' });
      }).toThrow(`Unable to use signing function with signature of type: ethereum.`);
    });
  });

  describe('in mainnet environment when bundling is enabled', () => {
    const warp = WarpFactory.forMainnet();

    it(`should set correct signature for 'use_wallet'`, () => {
      const sut = new Signature(warp, 'use_wallet');
      expect(sut.signer.toString().replace(/\s+/g, '')).toEqual(signingFunction);
      expect(sut.type).toStrictEqual('arweave');
    });

    it(`should set correct signature for jwk`, () => {
      const sut = new Signature(warp, {
        kty: '',
        e: '',
        n: ''
      });
      expect(sut.signer.toString().replace(/\s+/g, '')).toEqual(signingFunction);
      expect(sut.type).toStrictEqual('arweave');
    });

    it(`should throw for custom signing function and ethereum signature type`, () => {
      expect(() => {
        const sut = new Signature(warp, { signer: sampleFunction, type: 'ethereum' });
      }).toThrow(`Unable to use signing function when bundling is enabled.`);
    });

    it(`should throw for custom signing function and arweave signature type`, () => {
      expect(() => {
        const sut = new Signature(warp, { signer: sampleFunction, type: 'arweave' });
      }).toThrow(`Unable to use signing function when bundling is enabled.`);
    });
  });

  describe('getAddress', () => {
    it('should getAddress for ArWallet signer', async () => {
      const warp = WarpFactory.forMainnet();
      const arWallet = await warp.generateWallet();

      const signature = new Signature(warp, arWallet.jwk);

      const address = await signature.getAddress();
      expect(address).toStrictEqual(arWallet.address);
    });

    it('should call getAddress for customSignature, if getAddress provided', async () => {
      const warp = WarpFactory.forMainnet(defaultCacheOptions, true);
      const customSignature: CustomSignature = {
        type: 'arweave',
        signer: sampleFunction,
        getAddress: () => Promise.resolve('owner')
      };

      const signature = new Signature(warp, customSignature);

      const address = await signature.getAddress();
      expect(address).toStrictEqual('owner');
    });

    it('should call getAddress for customSignature, if getAddress NOT provided', async () => {
      const warp = WarpFactory.forMainnet(defaultCacheOptions, true);
      const customSignature: CustomSignature = {
        type: 'arweave',
        signer: async (tx) => {
          Promise.resolve(tx);
        }
      };

      const signature = new Signature(warp, customSignature);

      const address = await signature.getAddress();
      expect(address).toStrictEqual('47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU');
    });

    it('should use cached valued from getAddress', async () => {
      const warp = WarpFactory.forMainnet(defaultCacheOptions, true);
      const customSignature: CustomSignature = {
        type: 'arweave',
        signer: async (tx) => {
          Promise.resolve(tx);
        }
      };

      const signature = new Signature(warp, customSignature);

      const address = await signature.getAddress();
      expect(address).toStrictEqual('47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU');

      const cachedAddress = await signature.getAddress();
      expect(cachedAddress).toStrictEqual('47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU');
    });
  });
});
