export declare class DataDB {
    private path;
    constructor(dbPath: string);
    insert(obj: {
        txid: string;
        data: string;
    }): Promise<{
        txid: string;
        data: string;
    }>;
    findOne(txid: string): Promise<{
        txid: string;
        data: string;
    }>;
}
