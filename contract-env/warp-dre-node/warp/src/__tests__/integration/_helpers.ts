import { Warp } from '../../core/Warp';

export async function mineBlock(warp: Warp) {
  await warp.testing.mineBlock();
}
