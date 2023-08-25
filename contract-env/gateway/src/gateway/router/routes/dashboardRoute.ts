import Router from '@koa/router';
import { Benchmark } from 'warp-contracts';

export async function dashboardRoute(ctx: Router.RouterContext) {
  const { logger, dbSource } = ctx;

  const { contractLimit, interactionLimit, testnet } = ctx.query;

  logger.debug('Contracts route', { contractLimit, interactionLimit });

  const bindings: any[] = [];
  contractLimit && bindings.push(contractLimit);
  interactionLimit && bindings.push(interactionLimit);

  try {
    const benchmark = Benchmark.measure();
    const result: any = await dbSource.raw(
      `
          with contract as (select 'contract'       AS contract_or_interaction,
                                   contract_id      AS contract_id,
                                   ''               AS interaction_id,
                                   owner            AS owner,
                                   type             AS contract_type,
                                   ''               AS function,
                                   block_height     AS block_height,
                                   sync_timestamp   AS sync_timestamp,
                                   ''               AS sort_key,
                                   CASE contracts.deployment_type
                                       WHEN 'warp-external' THEN 'warp'
                                       WHEN 'warp-direct' THEN 'warp'
                                       WHEN 'warp-wrapped' THEN 'warp'
                                       ELSE contracts.deployment_type
                                       END      AS source
                          from contracts
                          where contract_id != ''
                            AND type != 'error'
                            AND testnet IS ${testnet ? ' NOT NULL ' : ' NULL '}
                            AND sync_timestamp IS NOT NULL
                          order by sync_timestamp DESC
                              LIMIT ${contractLimit ? ' ? ' : ' 100'}
            ),
              interaction as (select 'interaction'  AS contract_or_interaction,
                                  contract_id       AS contract_id,
                                  interaction_id    AS interaction_id,
                                  owner             AS owner,
                                  ''                AS contract_type,
                                  function          AS function,
                                  block_height      AS block_height,
                                  sync_timestamp    AS sync_timestamp,
                                  sort_key          AS sort_key,
                                  CASE source
                                  WHEN 'redstone-sequencer' THEN 'sequencer'
                                  ELSE source
                                  END        AS source
                                from interactions
                            where contract_id != ''
                                AND testnet IS ${testnet ? ' NOT NULL ' : ' NULL '}
                                AND sync_timestamp IS NOT NULL
                                order by sync_timestamp desc
                                LIMIT ${interactionLimit ? ' ? ' : ' 100'}
                                )
                                select * from contract
                                union all
                                select * from interaction;
      `,
      bindings
    );

    ctx.body = {
      summary: {
        contractLimit: contractLimit,
        interactionLimit: interactionLimit,
        itemsCount: result?.rows.length,
      },
      contracts: result?.rows,
    };
    logger.debug('Contracts loaded in', benchmark.elapsed());
  } catch (e: any) {
    ctx.logger.error(e);
    ctx.status = 500;
    ctx.body = { message: e };
  }
}
