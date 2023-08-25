create table arsyncer
(
    last_checked_height int not null
);

create index arsyncer_last_checked_height_index
    on arsyncer (last_checked_height);

insert into arsyncer
select max(block_height) from interactions;
