import { Next } from 'koa';
import Router from 'koa-router';
export declare function txAccessMiddleware(ctx: Router.RouterContext, next: Next): Promise<void>;
export declare function txValidateMiddleware(ctx: Router.RouterContext, next: Next): Promise<void>;
