import { VrfData } from '../legacy/gqlResult';

export const knownWarpPluginsPartial = [`^smartweave-extension-`] as const;
export const knownWarpPlugins = [
  'evm-signature-verification',
  'subscription',
  'ivm-handler-api',
  'evaluation-progress',
  'fetch-options',
  'deploy',
  'contract-blacklist',
  'vm2',
  'vrf'
] as const;
type WarpPluginPartialType = `smartweave-extension-${string}`;
export type WarpKnownPluginType = (typeof knownWarpPlugins)[number];
export type WarpPluginType = WarpKnownPluginType | WarpPluginPartialType;

export interface WarpPlugin<T, R> {
  type(): WarpPluginType;

  process(input: T): R;
}

export type VrfPluginFunctions = {
  generateMockVrf(sortKey: string): VrfData;
  verify(vrf: VrfData, sortKey: string): boolean;
};
