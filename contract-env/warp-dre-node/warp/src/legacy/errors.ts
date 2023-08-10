export const enum SmartWeaveErrorType {
  CONTRACT_NOT_FOUND = 'CONTRACT_NOT_FOUND'
}

type SmartWeaveErrorInfo = {
  message?: string;
  requestedTxId?: string;
};

export class SmartWeaveError extends Error {
  public readonly type: SmartWeaveErrorType;
  public readonly otherInfo: SmartWeaveErrorInfo;

  constructor(type: SmartWeaveErrorType, optional: SmartWeaveErrorInfo = {}) {
    if (optional.message) {
      super(optional.message);
    } else {
      super();
    }
    this.type = type;
    this.otherInfo = optional;
  }

  public getType(): SmartWeaveErrorType {
    return this.type;
  }
}
