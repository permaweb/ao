/// <reference types="node" />
export declare const sleep: (ms: number) => Promise<void>;
export declare const safeParseInt: (str: string) => number;
export declare const deepCopy: (input: unknown) => any;
export declare const mapReplacer: (key: unknown, value: unknown) => unknown;
export declare const mapReviver: (key: unknown, value: any) => any;
export declare const asc: (a: number, b: number) => number;
export declare const ascS: (a: string, b: string) => number;
export declare const desc: (a: number, b: number) => number;
export declare const descS: (a: string, b: string) => number;
export declare function timeout(s: number): {
    timeoutId: number;
    timeoutPromise: Promise<any>;
};
export declare function stripTrailingSlash(str: string): string;
export declare function indent(callDepth: number): string;
export declare function bufToBn(buf: Buffer): bigint;
export declare const isBrowser: Function;
export declare function getJsonResponse<T>(response: Promise<Response>): Promise<T>;
//# sourceMappingURL=utils.d.ts.map