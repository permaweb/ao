import Router from 'koa-router';
export declare const walletRegex: RegExp;
export declare function getBalanceRoute(ctx: Router.RouterContext): Promise<void>;
export declare function createWalletRoute(ctx: Router.RouterContext): Promise<void>;
export declare function getLastWalletTxRoute(ctx: Router.RouterContext): Promise<void>;
export declare function updateBalanceRoute(ctx: Router.RouterContext): Promise<void>;
export declare function addBalanceRoute(ctx: Router.RouterContext): Promise<void>;
