export declare const enum SmartWeaveErrorType {
    CONTRACT_NOT_FOUND = "CONTRACT_NOT_FOUND"
}
export default class SmartWeaveError extends Error {
    readonly type: SmartWeaveErrorType;
    readonly otherInfo: object;
    constructor(type: SmartWeaveErrorType, optional?: {
        message?: string;
        requestedTxId?: string;
    });
    getType(): SmartWeaveErrorType;
}
