export declare const enum SmartWeaveErrorType {
    CONTRACT_NOT_FOUND = "CONTRACT_NOT_FOUND"
}
type SmartWeaveErrorInfo = {
    message?: string;
    requestedTxId?: string;
};
export declare class SmartWeaveError extends Error {
    readonly type: SmartWeaveErrorType;
    readonly otherInfo: SmartWeaveErrorInfo;
    constructor(type: SmartWeaveErrorType, optional?: SmartWeaveErrorInfo);
    getType(): SmartWeaveErrorType;
}
export {};
//# sourceMappingURL=errors.d.ts.map