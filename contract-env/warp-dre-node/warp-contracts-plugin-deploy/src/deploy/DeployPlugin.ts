import { CreateContractImpl } from './impl/CreateContractImpl';
import { WarpPluginType, WarpPlugin, Warp, CreateContract } from 'warp-contracts';

export class DeployPlugin implements WarpPlugin<Warp, CreateContract> {
  process(warp: Warp): CreateContract {
    return new CreateContractImpl(warp);
  }

  type(): WarpPluginType {
    return 'deploy';
  }
}
