import { ApolloServer, Config } from 'apollo-server-koa';
import { BaseContext, DefaultContext } from 'koa';
import { Knex } from 'knex';
export declare function graphServer(opts: Config, ctx: BaseContext & DefaultContext, connection: Knex): ApolloServer;
