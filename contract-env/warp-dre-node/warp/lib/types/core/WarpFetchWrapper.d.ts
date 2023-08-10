import { Warp } from './Warp';
export interface FetchRequest {
    input: RequestInfo | URL;
    init: Partial<RequestInit>;
}
export declare class WarpFetchWrapper {
    private warp;
    private readonly name;
    private readonly logger;
    constructor(warp: Warp);
    fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}
//# sourceMappingURL=WarpFetchWrapper.d.ts.map