import { GraphQLResolveInfo } from 'graphql';
export declare type Maybe<T> = T | null;
export declare type Exact<T extends {
    [key: string]: unknown;
}> = {
    [K in keyof T]: T[K];
};
export declare type RequireFields<T, K extends keyof T> = {
    [X in Exclude<keyof T, K>]?: T[X];
} & {
    [P in K]-?: NonNullable<T[P]>;
};
/** All built-in and custom scalars, mapped to their actual values */
export declare type Scalars = {
    ID: string;
    String: string;
    Boolean: boolean;
    Int: number;
    Float: number;
};
export declare type Query = {
    __typename?: 'Query';
    /** Get a transaction by its id */
    transaction?: Maybe<Transaction>;
    /** Get a paginated set of matching transactions using filters. */
    transactions: TransactionConnection;
    block?: Maybe<Block>;
    blocks: BlockConnection;
};
export declare type QueryTransactionArgs = {
    id: Scalars['ID'];
};
export declare type QueryTransactionsArgs = {
    ids?: Maybe<Scalars['ID'][]>;
    owners?: Maybe<Scalars['String'][]>;
    recipients?: Maybe<Scalars['String'][]>;
    tags?: Maybe<TagFilter[]>;
    bundledIn?: Maybe<Scalars['ID'][]>;
    block?: Maybe<BlockFilter>;
    first?: Maybe<Scalars['Int']>;
    after?: Maybe<Scalars['String']>;
    sort?: Maybe<SortOrder>;
};
export declare type QueryBlockArgs = {
    id?: Maybe<Scalars['String']>;
};
export declare type QueryBlocksArgs = {
    ids?: Maybe<Scalars['ID'][]>;
    height?: Maybe<BlockFilter>;
    first?: Maybe<Scalars['Int']>;
    after?: Maybe<Scalars['String']>;
    sort?: Maybe<SortOrder>;
};
/** Optionally reverse the result sort order from `HEIGHT_DESC` (default) to `HEIGHT_ASC`. */
export declare enum SortOrder {
    /** Results are sorted by the transaction block height in ascending order, with the oldest transactions appearing first, and the most recent and pending/unconfirmed appearing last. */
    HeightAsc = "HEIGHT_ASC",
    /** Results are sorted by the transaction block height in descending order, with the most recent and unconfirmed/pending transactions appearing first. */
    HeightDesc = "HEIGHT_DESC"
}
/** Find transactions with the folowing tag name and value */
export declare type TagFilter = {
    /** The tag name */
    name: Scalars['String'];
    /**
     * An array of values to match against. If multiple values are passed then transactions with _any_ matching tag value from the set will be returned.
     *
     * e.g.
     *
     * \`{name: "app-name", values: ["app-1"]}\`
     *
     * Returns all transactions where the \`app-name\` tag has a value of \`app-1\`.
     *
     * \`{name: "app-name", values: ["app-1", "app-2", "app-3"]}\`
     *
     * Returns all transactions where the \`app-name\` tag has a value of either \`app-1\` _or_ \`app-2\` _or_ \`app-3\`.
     */
    values: Scalars['String'][];
    /** The operator to apply to to the tag filter. Defaults to EQ (equal). */
    op?: Maybe<TagOperator>;
};
/** Find blocks within a given range */
export declare type BlockFilter = {
    /** Minimum block height to filter from */
    min?: Maybe<Scalars['Int']>;
    /** Maximum block height to filter to */
    max?: Maybe<Scalars['Int']>;
};
/**
 * Paginated result set using the GraphQL cursor spec,
 * see: https://relay.dev/graphql/connections.htm.
 */
export declare type BlockConnection = {
    __typename?: 'BlockConnection';
    pageInfo: PageInfo;
    edges: BlockEdge[];
};
/** Paginated result set using the GraphQL cursor spec. */
export declare type BlockEdge = {
    __typename?: 'BlockEdge';
    /**
     * The cursor value for fetching the next page.
     *
     * Pass this to the \`after\` parameter in \`blocks(after: $cursor)\`, the next page will start from the next item after this.
     */
    cursor: Scalars['String'];
    /** A block object. */
    node: Block;
};
/**
 * Paginated result set using the GraphQL cursor spec,
 * see: https://relay.dev/graphql/connections.htm.
 */
export declare type TransactionConnection = {
    __typename?: 'TransactionConnection';
    pageInfo: PageInfo;
    edges: TransactionEdge[];
};
/** Paginated result set using the GraphQL cursor spec. */
export declare type TransactionEdge = {
    __typename?: 'TransactionEdge';
    /**
     * The cursor value for fetching the next page.
     *
     * Pass this to the \`after\` parameter in \`transactions(after: $cursor)\`, the next page will start from the next item after this.
     */
    cursor: Scalars['String'];
    /** A transaction object. */
    node: Transaction;
};
/** Paginated page info using the GraphQL cursor spec. */
export declare type PageInfo = {
    __typename?: 'PageInfo';
    hasNextPage: Scalars['Boolean'];
};
export declare type Transaction = {
    __typename?: 'Transaction';
    id: Scalars['ID'];
    anchor: Scalars['String'];
    signature: Scalars['String'];
    recipient: Scalars['String'];
    owner: Owner;
    fee: Amount;
    quantity: Amount;
    data: MetaData;
    tags: Tag[];
    /** Transactions with a null block are recent and unconfirmed, if they aren't mined into a block within 60 minutes they will be removed from results. */
    block?: Maybe<Block>;
    /**
     * Transactions with parent are Bundled Data Items as defined in the ANS-102 data spec. https://github.com/ArweaveTeam/arweave-standards/blob/master/ans/ANS-102.md
     * @deprecated Use `bundledIn`
     */
    parent?: Maybe<Parent>;
    /**
     * For bundled data items this references the containing bundle ID.
     * See: https://github.com/ArweaveTeam/arweave-standards/blob/master/ans/ANS-102.md
     */
    bundledIn?: Maybe<Bundle>;
};
/**
 * The parent transaction for bundled transactions,
 * see: https://github.com/ArweaveTeam/arweave-standards/blob/master/ans/ANS-102.md.
 */
export declare type Parent = {
    __typename?: 'Parent';
    id: Scalars['ID'];
};
/**
 * The data bundle containing the current data item.
 * See: https://github.com/ArweaveTeam/arweave-standards/blob/master/ans/ANS-102.md.
 */
export declare type Bundle = {
    __typename?: 'Bundle';
    /** ID of the containing data bundle. */
    id: Scalars['ID'];
};
export declare type Block = {
    __typename?: 'Block';
    /** The block ID. */
    id: Scalars['ID'];
    /** The block timestamp (UTC). */
    timestamp: Scalars['Int'];
    /** The block height. */
    height: Scalars['Int'];
    /** The previous block ID. */
    previous: Scalars['ID'];
};
/** Basic metadata about the transaction data payload. */
export declare type MetaData = {
    __typename?: 'MetaData';
    /** Size of the associated data in bytes. */
    size: Scalars['String'];
    /** Type is derrived from the \`content-type\` tag on a transaction. */
    type?: Maybe<Scalars['String']>;
};
/** Representation of a value transfer between wallets, in both winson and ar. */
export declare type Amount = {
    __typename?: 'Amount';
    /** Amount as a winston string e.g. \`"1000000000000"\`. */
    winston: Scalars['String'];
    /** Amount as an AR string e.g. \`"0.000000000001"\`. */
    ar: Scalars['String'];
};
/** Representation of a transaction owner. */
export declare type Owner = {
    __typename?: 'Owner';
    /** The owner's wallet address. */
    address: Scalars['String'];
    /** The owner's public key as a base64url encoded string. */
    key: Scalars['String'];
};
export declare type Tag = {
    __typename?: 'Tag';
    /** UTF-8 tag name */
    name: Scalars['String'];
    /** UTF-8 tag value */
    value: Scalars['String'];
};
/** The operator to apply to a tag value. */
export declare enum TagOperator {
    /** Equal */
    Eq = "EQ",
    /** Not equal */
    Neq = "NEQ"
}
export declare type ResolverTypeWrapper<T> = Promise<T> | T;
export declare type LegacyStitchingResolver<TResult, TParent, TContext, TArgs> = {
    fragment: string;
    resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export declare type NewStitchingResolver<TResult, TParent, TContext, TArgs> = {
    selectionSet: string;
    resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export declare type StitchingResolver<TResult, TParent, TContext, TArgs> = LegacyStitchingResolver<TResult, TParent, TContext, TArgs> | NewStitchingResolver<TResult, TParent, TContext, TArgs>;
export declare type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> = ResolverFn<TResult, TParent, TContext, TArgs> | StitchingResolver<TResult, TParent, TContext, TArgs>;
export declare type ResolverFn<TResult, TParent, TContext, TArgs> = (parent: TParent, args: TArgs, context: TContext, info: GraphQLResolveInfo) => Promise<TResult> | TResult;
export declare type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (parent: TParent, args: TArgs, context: TContext, info: GraphQLResolveInfo) => AsyncIterator<TResult> | Promise<AsyncIterator<TResult>>;
export declare type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (parent: TParent, args: TArgs, context: TContext, info: GraphQLResolveInfo) => TResult | Promise<TResult>;
export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
    subscribe: SubscriptionSubscribeFn<{
        [key in TKey]: TResult;
    }, TParent, TContext, TArgs>;
    resolve?: SubscriptionResolveFn<TResult, {
        [key in TKey]: TResult;
    }, TContext, TArgs>;
}
export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
    subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
    resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}
export declare type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> = SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs> | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;
export declare type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> = ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>) | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;
export declare type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (parent: TParent, context: TContext, info: GraphQLResolveInfo) => Maybe<TTypes> | Promise<Maybe<TTypes>>;
export declare type IsTypeOfResolverFn<T = {}> = (obj: T, info: GraphQLResolveInfo) => boolean | Promise<boolean>;
export declare type NextResolverFn<T> = () => Promise<T>;
export declare type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (next: NextResolverFn<TResult>, parent: TParent, args: TArgs, context: TContext, info: GraphQLResolveInfo) => TResult | Promise<TResult>;
/** Mapping between all available schema types and the resolvers types */
export declare type ResolversTypes = {
    Query: ResolverTypeWrapper<{}>;
    ID: ResolverTypeWrapper<Scalars['ID']>;
    String: ResolverTypeWrapper<Scalars['String']>;
    Int: ResolverTypeWrapper<Scalars['Int']>;
    SortOrder: SortOrder;
    TagFilter: TagFilter;
    BlockFilter: BlockFilter;
    BlockConnection: ResolverTypeWrapper<BlockConnection>;
    BlockEdge: ResolverTypeWrapper<BlockEdge>;
    TransactionConnection: ResolverTypeWrapper<TransactionConnection>;
    TransactionEdge: ResolverTypeWrapper<TransactionEdge>;
    PageInfo: ResolverTypeWrapper<PageInfo>;
    Boolean: ResolverTypeWrapper<Scalars['Boolean']>;
    Transaction: ResolverTypeWrapper<Transaction>;
    Parent: ResolverTypeWrapper<Parent>;
    Bundle: ResolverTypeWrapper<Bundle>;
    Block: ResolverTypeWrapper<Block>;
    MetaData: ResolverTypeWrapper<MetaData>;
    Amount: ResolverTypeWrapper<Amount>;
    Owner: ResolverTypeWrapper<Owner>;
    Tag: ResolverTypeWrapper<Tag>;
    TagOperator: TagOperator;
};
/** Mapping between all available schema types and the resolvers parents */
export declare type ResolversParentTypes = {
    Query: {};
    ID: Scalars['ID'];
    String: Scalars['String'];
    Int: Scalars['Int'];
    TagFilter: TagFilter;
    BlockFilter: BlockFilter;
    BlockConnection: BlockConnection;
    BlockEdge: BlockEdge;
    TransactionConnection: TransactionConnection;
    TransactionEdge: TransactionEdge;
    PageInfo: PageInfo;
    Boolean: Scalars['Boolean'];
    Transaction: Transaction;
    Parent: Parent;
    Bundle: Bundle;
    Block: Block;
    MetaData: MetaData;
    Amount: Amount;
    Owner: Owner;
    Tag: Tag;
};
export declare type QueryResolvers<ContextType = any, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
    transaction?: Resolver<Maybe<ResolversTypes['Transaction']>, ParentType, ContextType, RequireFields<QueryTransactionArgs, 'id'>>;
    transactions?: Resolver<ResolversTypes['TransactionConnection'], ParentType, ContextType, RequireFields<QueryTransactionsArgs, 'first' | 'sort'>>;
    block?: Resolver<Maybe<ResolversTypes['Block']>, ParentType, ContextType, RequireFields<QueryBlockArgs, never>>;
    blocks?: Resolver<ResolversTypes['BlockConnection'], ParentType, ContextType, RequireFields<QueryBlocksArgs, 'first' | 'sort'>>;
};
export declare type BlockConnectionResolvers<ContextType = any, ParentType extends ResolversParentTypes['BlockConnection'] = ResolversParentTypes['BlockConnection']> = {
    pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
    edges?: Resolver<ResolversTypes['BlockEdge'][], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType>;
};
export declare type BlockEdgeResolvers<ContextType = any, ParentType extends ResolversParentTypes['BlockEdge'] = ResolversParentTypes['BlockEdge']> = {
    cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
    node?: Resolver<ResolversTypes['Block'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType>;
};
export declare type TransactionConnectionResolvers<ContextType = any, ParentType extends ResolversParentTypes['TransactionConnection'] = ResolversParentTypes['TransactionConnection']> = {
    pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
    edges?: Resolver<ResolversTypes['TransactionEdge'][], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType>;
};
export declare type TransactionEdgeResolvers<ContextType = any, ParentType extends ResolversParentTypes['TransactionEdge'] = ResolversParentTypes['TransactionEdge']> = {
    cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
    node?: Resolver<ResolversTypes['Transaction'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType>;
};
export declare type PageInfoResolvers<ContextType = any, ParentType extends ResolversParentTypes['PageInfo'] = ResolversParentTypes['PageInfo']> = {
    hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType>;
};
export declare type TransactionResolvers<ContextType = any, ParentType extends ResolversParentTypes['Transaction'] = ResolversParentTypes['Transaction']> = {
    id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
    anchor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
    signature?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
    recipient?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
    owner?: Resolver<ResolversTypes['Owner'], ParentType, ContextType>;
    fee?: Resolver<ResolversTypes['Amount'], ParentType, ContextType>;
    quantity?: Resolver<ResolversTypes['Amount'], ParentType, ContextType>;
    data?: Resolver<ResolversTypes['MetaData'], ParentType, ContextType>;
    tags?: Resolver<ResolversTypes['Tag'][], ParentType, ContextType>;
    block?: Resolver<Maybe<ResolversTypes['Block']>, ParentType, ContextType>;
    parent?: Resolver<Maybe<ResolversTypes['Parent']>, ParentType, ContextType>;
    bundledIn?: Resolver<Maybe<ResolversTypes['Bundle']>, ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType>;
};
export declare type ParentResolvers<ContextType = any, ParentType extends ResolversParentTypes['Parent'] = ResolversParentTypes['Parent']> = {
    id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType>;
};
export declare type BundleResolvers<ContextType = any, ParentType extends ResolversParentTypes['Bundle'] = ResolversParentTypes['Bundle']> = {
    id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType>;
};
export declare type BlockResolvers<ContextType = any, ParentType extends ResolversParentTypes['Block'] = ResolversParentTypes['Block']> = {
    id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
    timestamp?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
    height?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
    previous?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType>;
};
export declare type MetaDataResolvers<ContextType = any, ParentType extends ResolversParentTypes['MetaData'] = ResolversParentTypes['MetaData']> = {
    size?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
    type?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType>;
};
export declare type AmountResolvers<ContextType = any, ParentType extends ResolversParentTypes['Amount'] = ResolversParentTypes['Amount']> = {
    winston?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
    ar?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType>;
};
export declare type OwnerResolvers<ContextType = any, ParentType extends ResolversParentTypes['Owner'] = ResolversParentTypes['Owner']> = {
    address?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
    key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType>;
};
export declare type TagResolvers<ContextType = any, ParentType extends ResolversParentTypes['Tag'] = ResolversParentTypes['Tag']> = {
    name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
    value?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType>;
};
export declare type Resolvers<ContextType = any> = {
    Query?: QueryResolvers<ContextType>;
    BlockConnection?: BlockConnectionResolvers<ContextType>;
    BlockEdge?: BlockEdgeResolvers<ContextType>;
    TransactionConnection?: TransactionConnectionResolvers<ContextType>;
    TransactionEdge?: TransactionEdgeResolvers<ContextType>;
    PageInfo?: PageInfoResolvers<ContextType>;
    Transaction?: TransactionResolvers<ContextType>;
    Parent?: ParentResolvers<ContextType>;
    Bundle?: BundleResolvers<ContextType>;
    Block?: BlockResolvers<ContextType>;
    MetaData?: MetaDataResolvers<ContextType>;
    Amount?: AmountResolvers<ContextType>;
    Owner?: OwnerResolvers<ContextType>;
    Tag?: TagResolvers<ContextType>;
};
/**
 * @deprecated
 * Use "Resolvers" root object instead. If you wish to get "IResolvers", add "typesPrefix: I" to your config.
 */
export declare type IResolvers<ContextType = any> = Resolvers<ContextType>;
