import { VrfData } from '../legacy/gqlResult';
export declare const knownWarpPluginsPartial: readonly ["^smartweave-extension-"];
export declare const knownWarpPlugins: readonly ["evm-signature-verification", "subscription", "ivm-handler-api", "evaluation-progress", "fetch-options", "deploy", "contract-blacklist", "vm2", "vrf"];
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
export {};
//# sourceMappingURL=WarpPlugin.d.ts.map