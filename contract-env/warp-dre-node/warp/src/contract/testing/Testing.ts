import Arweave from 'arweave';
import { JWKInterface } from '../../utils/types/arweave-types';

export type Wallet = {
  jwk: JWKInterface;
  address: string;
};

export class Testing {
  constructor(private readonly arweave: Arweave) {}

  async mineBlock(): Promise<void> {
    this.validateEnv();
    await this.arweave.api.get('mine');
  }

  async addFunds(wallet: JWKInterface) {
    const walletAddress = await this.arweave.wallets.getAddress(wallet);
    await this.arweave.api.get(`/mint/${walletAddress}/1000000000000000`);
  }

  async isArlocal(): Promise<boolean> {
    const response = await fetch(
      `${this.arweave.api.config.protocol}://${this.arweave.api.config.host}:${this.arweave.api.config.port}/info`
    )
      .then((res) => {
        return res.ok ? res.json() : Promise.reject();
      })
      .catch((e) => {
        throw new Error(`Unable to get network info: ${e.message}`);
      });

    return response.network.includes('arlocal');
  }

  private async validateEnv(): Promise<void> {
    if (!(await this.isArlocal())) {
      throw new Error('Testing features are not available in a non testing environment');
    }
  }
}
