alter table contracts
    add pst_ticker text;

alter table contracts
    add pst_name text;

create index contracts_pst_name_index
    on contracts (pst_name);

create index contracts_pst_ticker_index
    on contracts (pst_ticker);

update contracts
set pst_ticker = init_state->>'ticker',
    pst_name = init_state->>'name'
where type = 'pst';
