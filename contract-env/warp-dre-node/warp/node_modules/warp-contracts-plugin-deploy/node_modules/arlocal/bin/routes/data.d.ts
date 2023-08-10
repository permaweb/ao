import { Next } from 'koa';
import Router from 'koa-router';
export declare const dataRouteRegex: RegExp;
export declare const pathRegex: RegExp;
export declare function dataHeadRoute(ctx: Router.RouterContext): Promise<void>;
export declare function dataRoute(ctx: Router.RouterContext): Promise<void>;
export declare function subDataRoute(ctx: Router.RouterContext, next: Next): Promise<any>;
