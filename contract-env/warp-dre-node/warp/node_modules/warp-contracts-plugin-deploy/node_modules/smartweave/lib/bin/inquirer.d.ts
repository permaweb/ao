interface InquirerResult {
    payFeeForContractCreation?: string;
    payFeeForContractInteraction?: string;
}
export declare const askForContractCreationConfirmation: (randWord: string, expectedContractCreationFee: string) => Promise<InquirerResult>;
export declare const askForContractInteractionConfirmation: (randWord: string, expectedContractInteractionFee: string) => Promise<InquirerResult>;
export {};
