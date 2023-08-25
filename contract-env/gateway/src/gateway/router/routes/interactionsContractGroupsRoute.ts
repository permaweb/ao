import Router from '@koa/router';
import { isTxIdValid } from '../../../utils';
import { Benchmark } from 'warp-contracts';
import { DatabaseSource } from '../../../db/databaseSource';

const MAX_INTERACTIONS_PER_PAGE = 50000;

function loadInteractionsForSrcTx(
  dbSource: DatabaseSource,
  group: string,
  fromSortKey: string,
  fromBlockHeight: number | null,
  limit: number,
  offset: number
) {
  const bindings: any[] = [];

  const parsedGroup = group.split(',');

  fromSortKey && bindings.push(fromSortKey);
  fromBlockHeight && bindings.push(fromBlockHeight);
  bindings.push(limit);
  bindings.push(offset);

  const query = `
      SELECT c.contract_id                                        as "contractId",
             c.block_height                                       as "contractCreation",
             c.src_tx_id                                          as "contractSourceId",
             (CASE WHEN i.sort_key IS NULL THEN c.init_state END) as "initState",
             i.sort_key                                           as "sortKey",
             i.interaction                                        as "interaction",
             i.confirmation_status                                as "confirmationStatus"
      FROM contracts c
               LEFT JOIN interactions i ON c.contract_id = i.contract_id
      WHERE c.src_tx_id IN (${parsedGroup.map((group) => `'${group}'`).join(', ')})
        AND (
              (i.sort_key is not null AND i.confirmation_status IN ('confirmed', 'not_processed')
                  ${fromSortKey ? ' AND i.sort_key > ?' : ''})
              OR (i.sort_key is null ${fromBlockHeight ? ' AND c.block_height >= ?' : ''})
          )
        -- note: there might multiple contracts at same block_height, so to get stable results during pagination
        -- - the c.contract_id column is added to sorting
      ORDER BY i.sort_key ASC NULLS LAST, c.block_height ASC, c.contract_id ASC
      LIMIT ? OFFSET ?;
  `;

  return dbSource.raw(query, bindings);
}

function loadInteractionsForGroup(
  dbSource: DatabaseSource,
  group: string,
  fromSortKey: string,
  fromBlockHeight: number | null,
  limit: number,
  offset: number
) {
  const bindings: any[] = [];
  if (group != 'all_pst') {
    throw new Error(`Unknown group ${group}`);
  }

  fromSortKey && bindings.push(fromSortKey);
  fromBlockHeight && bindings.push(fromBlockHeight);
  bindings.push(limit);
  bindings.push(offset);

  const query = `
      SELECT c.contract_id                                        as "contractId",
             c.block_height                                       as "contractCreation",
             c.src_tx_id                                          as "contractSourceId",
             (CASE WHEN i.sort_key IS NULL THEN c.init_state END) as "initState",
             i.sort_key                                           as "sortKey",
             i.interaction                                        as "interaction",
             i.confirmation_status                                as "confirmationStatus"
      FROM contracts c
               LEFT JOIN interactions i ON c.contract_id = i.contract_id
               JOIN contracts_src s ON s.src_tx_id = c.src_tx_id
      WHERE c.type = 'pst'
        AND c.content_type = 'application/json'
        AND c.contract_id NOT IN (
                                  'LkfzZvdl_vfjRXZOPjnov18cGnnK3aDKj0qSQCgkCX8', /* kyve  */
                                  'l6S4oMyzw_rggjt4yt4LrnRmggHQ2CdM1hna2MK4o_c', /* kyve  */
                                  'B1SRLyFzWJjeA0ywW41Qu1j7ZpBLHsXSSrWLrT3ebd8', /* kyve  */
                                  'cETTyJQYxJLVQ6nC3VxzsZf1x2-6TW2LFkGZa91gUWc', /* koi   */
                                  'QA7AIFVx1KBBmzC7WUNhJbDsHlSJArUT0jWrhZMZPS8', /* koi   */
                                  '8cq1wbjWHNiPg7GwYpoDT2m9HX99LY7tklRQWfh1L6c', /* kyve  */
                                  'NwaSMGCdz6Yu5vNjlMtCNBmfEkjYfT-dfYkbQQDGn5s', /* koi   */
                                  'qzVAzvhwr1JFTPE8lIU9ZG_fuihOmBr7ewZFcT3lIUc', /* koi   */
                                  'OFD4GqQcqp-Y_Iqh8DN_0s3a_68oMvvnekeOEu_a45I', /* kyve  */
                                  'CdPAQNONoR83Shj3CbI_9seC-LqgI1oLaRJhSwP90-o', /* koi   */
                                  'dNXaqE_eATp2SRvyFjydcIPHbsXAe9UT-Fktcqs7MDk' /* kyve  */)
        AND c.src_tx_id NOT IN ('Qa7IR-xvPkBtcYUBZXd8z-Tu611VeJH33uEA5XiFUNA') /* Hoh */
        AND (
              (i.sort_key is not null AND i.confirmation_status IN ('confirmed', 'not_processed')
                  ${fromSortKey ? ' AND i.sort_key > ?' : ''})
              OR (i.sort_key is null ${fromBlockHeight ? ' AND c.block_height >= ?' : ''})
          )
        AND ((s.src_content_type = 'application/javascript'
          AND (s.src NOT LIKE '%readContractState%' AND s.src NOT LIKE '%unsafeClient%'))
          OR s.src_content_type = 'application/wasm')
        -- note: there might multiple contracts at same block_height, so to get stable results during pagination
        -- - the c.contract_id column is added to sorting
      ORDER BY i.sort_key ASC NULLS LAST, c.block_height ASC, c.contract_id ASC
      LIMIT ? OFFSET ?;
  `;

  return dbSource.raw(query, bindings);
}

export async function interactionsContractGroupsRoute(ctx: Router.RouterContext) {
  const { dbSource, logger } = ctx;
  const { group, fromSortKey, fromBlockHeight, page, limit } = ctx.query;
  const parsedPage = page ? parseInt(page as string) : 1;
  const parsedLimit = limit
    ? Math.min(parseInt(limit as string), MAX_INTERACTIONS_PER_PAGE)
    : MAX_INTERACTIONS_PER_PAGE;
  const offset = (parsedPage - 1) * parsedLimit;
  const parsedGroup = group as string;
  const parsedBlockHeight = fromBlockHeight ? parseInt(fromBlockHeight as string) : null;

  let result;

  try {
    const benchmark = Benchmark.measure();
    result = isTxIdValid(parsedGroup)
      ? await loadInteractionsForSrcTx(
          dbSource,
          parsedGroup,
          fromSortKey as string,
          parsedBlockHeight,
          parsedLimit,
          offset
        )
      : await loadInteractionsForGroup(
          dbSource,
          parsedGroup,
          fromSortKey as string,
          parsedBlockHeight,
          parsedLimit,
          offset
        );

    logger.info(`Loading contract groups interactions: ${benchmark.elapsed()}`);

    const interactions = [];
    for (let row of result?.rows) {
      interactions.push({
        contractId: row.contractId,
        ...row.interaction,
        confirmationStatus: row.confirmationStatus,
        sortKey: row.sortKey,
        contractCreation: row.contractCreation,
        initState: row.initState,
        contractSourceId: row.contractSourceId,
      });
    }

    ctx.body = {
      paging: {
        limit: parsedLimit,
        items: result?.rows.length,
        page: parsedPage,
      },
      interactions,
    };
  } catch (e: any) {
    ctx.logger.error(e);
    ctx.status = 500;
    ctx.body = { message: e };
  }
}
