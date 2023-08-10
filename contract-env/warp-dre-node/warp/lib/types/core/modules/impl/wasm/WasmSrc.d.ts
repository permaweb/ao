/// <reference types="node" />
export declare class WasmSrc {
    private readonly src;
    private readonly logger;
    readonly splitted: Buffer[];
    constructor(src: Buffer);
    wasmBinary(): Buffer;
    sourceCode(): Promise<Map<string, string>>;
    additionalCode(): string | null;
    private splitBuffer;
}
//# sourceMappingURL=WasmSrc.d.ts.map