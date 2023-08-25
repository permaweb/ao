drop index idx_interaction_owner_gin;
create index interactions_owner_index
    on interactions (owner);
