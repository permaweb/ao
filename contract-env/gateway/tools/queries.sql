select max(block_height) - 1
from interactions;

select *
from interactions limit 10;

select count("transaction") as transactions, contract_id from interactions
group by contract_id order by transactions desc;

select count(*)
from interactions
where contract_id not in ("LkfzZvdl_vfjRXZOPjnov18cGnnK3aDKj0qSQCgkCX8", /*kyve*/
                          "l6S4oMyzw_rggjt4yt4LrnRmggHQ2CdM1hna2MK4o_c", /*kyve*/
                          "B1SRLyFzWJjeA0ywW41Qu1j7ZpBLHsXSSrWLrT3ebd8", /*kyve*/
                          "cETTyJQYxJLVQ6nC3VxzsZf1x2-6TW2LFkGZa91gUWc", /*koi*/
                          "QA7AIFVx1KBBmzC7WUNhJbDsHlSJArUT0jWrhZMZPS8", /*koi*/
                          "8cq1wbjWHNiPg7GwYpoDT2m9HX99LY7tklRQWfh1L6c", /*kyve*/
                          "NwaSMGCdz6Yu5vNjlMtCNBmfEkjYfT-dfYkbQQDGn5s", /*koi*/
                          "qzVAzvhwr1JFTPE8lIU9ZG_fuihOmBr7ewZFcT3lIUc", /*koi*/
                          "OFD4GqQcqp-Y_Iqh8DN_0s3a_68oMvvnekeOEu_a45I", /*kyve*/
                          "CdPAQNONoR83Shj3CbI_9seC-LqgI1oLaRJhSwP90-o", /*koi*/
                          "dNXaqE_eATp2SRvyFjydcIPHbsXAe9UT-Fktcqs7MDk"  /*kyve*/ );

select count("transaction") as transactions, contract_id from interactions
where contract_id not in ("LkfzZvdl_vfjRXZOPjnov18cGnnK3aDKj0qSQCgkCX8", /*kyve*/
                          "l6S4oMyzw_rggjt4yt4LrnRmggHQ2CdM1hna2MK4o_c", /*kyve*/
                          "B1SRLyFzWJjeA0ywW41Qu1j7ZpBLHsXSSrWLrT3ebd8", /*kyve*/
                          "cETTyJQYxJLVQ6nC3VxzsZf1x2-6TW2LFkGZa91gUWc", /*koi*/
                          "QA7AIFVx1KBBmzC7WUNhJbDsHlSJArUT0jWrhZMZPS8", /*koi*/
                          "8cq1wbjWHNiPg7GwYpoDT2m9HX99LY7tklRQWfh1L6c", /*kyve*/
                          "NwaSMGCdz6Yu5vNjlMtCNBmfEkjYfT-dfYkbQQDGn5s", /*koi*/
                          "qzVAzvhwr1JFTPE8lIU9ZG_fuihOmBr7ewZFcT3lIUc", /*koi*/
                          "OFD4GqQcqp-Y_Iqh8DN_0s3a_68oMvvnekeOEu_a45I", /*kyve*/
                          "CdPAQNONoR83Shj3CbI_9seC-LqgI1oLaRJhSwP90-o", /*koi*/
                          "dNXaqE_eATp2SRvyFjydcIPHbsXAe9UT-Fktcqs7MDk"  /*kyve*/ )
group by contract_id order by transactions desc;

-- 789763 before fix
select min(block_height) from interactions where confirmation_status != 'not_processed';

select count(*) from interactions
where confirmation_status == 'not_processed'
  and contract_id not in ("LkfzZvdl_vfjRXZOPjnov18cGnnK3aDKj0qSQCgkCX8", /*kyve*/
                          "l6S4oMyzw_rggjt4yt4LrnRmggHQ2CdM1hna2MK4o_c", /*kyve*/
                          "B1SRLyFzWJjeA0ywW41Qu1j7ZpBLHsXSSrWLrT3ebd8", /*kyve*/
                          "cETTyJQYxJLVQ6nC3VxzsZf1x2-6TW2LFkGZa91gUWc", /*koi*/
                          "QA7AIFVx1KBBmzC7WUNhJbDsHlSJArUT0jWrhZMZPS8", /*koi*/
                          "8cq1wbjWHNiPg7GwYpoDT2m9HX99LY7tklRQWfh1L6c", /*kyve*/
                          "NwaSMGCdz6Yu5vNjlMtCNBmfEkjYfT-dfYkbQQDGn5s", /*koi*/
                          "qzVAzvhwr1JFTPE8lIU9ZG_fuihOmBr7ewZFcT3lIUc", /*koi*/
                          "OFD4GqQcqp-Y_Iqh8DN_0s3a_68oMvvnekeOEu_a45I", /*kyve*/
                          "CdPAQNONoR83Shj3CbI_9seC-LqgI1oLaRJhSwP90-o", /*koi*/
                          "dNXaqE_eATp2SRvyFjydcIPHbsXAe9UT-Fktcqs7MDk"  /*kyve*/ )
;


select id, confirmation_status from interactions where id = 'N_nX-l37Jrn8JrVnIMvvncPftE9G-SDFwZYiuTHtVZc';

select * from interactions where id = '6nllL6LS8LTDJY-WyAzaEO17_Xf49_E74M3XRahzLrY';

-- TODO: verify if each confirmation has distint peers
WITH RECURSIVE split(value, str) AS (
    SELECT '', confirming_peer||',' FROM interactions where confirmation_status != 'not_processed'
    UNION ALL
    SELECT
        substr(str, 0, instr(str, ',')),
        substr(str, instr(str, ',')+1)
    FROM split WHERE str!=''
) SELECT value FROM split WHERE value is not NULL;

select confirming_peer from interactions where confirmation_status != 'not_processed';

update interactions
set confirmation_status = "not_processed"
where id = '6nllL6LS8LTDJY-WyAzaEO17_Xf49_E74M3XRahzLrY';


update interactions set confirmation_status = 'not_processed' where id = '';

SELECT block_height, id FROM interactions
WHERE block_height < (SELECT max(block_height) FROM interactions) - 15
  AND confirmation_status = 'not_processed'
ORDER BY block_height DESC LIMIT 100;

-- cETTyJQYxJLVQ6nC3VxzsZf1x2-6TW2LFkGZa91gUWc koi token
-- QA7AIFVx1KBBmzC7WUNhJbDsHlSJArUT0jWrhZMZPS8 some koi stuff
-- -8A6RexFkpfWwuyVO98wzSFZh0d6VJuI-buTJvlwOJQ - ardrive
-- SJ3l7474UHh3Dw6dWVT1bzsJ-8JvOewtGoDdOecWIZo - check
-- NwaSMGCdz6Yu5vNjlMtCNBmfEkjYfT-dfYkbQQDGn5s
-- Daj-MNSnH55TDfxqC7v4eq0lKzVIwh98srUaWqyuZtY
select block_height, id, input, function, contract_id, "transaction"
from interactions
where contract_id = "-8A6RexFkpfWwuyVO98wzSFZh0d6VJuI-buTJvlwOJQ";


select * from interactions where contract_id = "Daj-MNSnH55TDfxqC7v4eq0lKzVIwh98srUaWqyuZtY"
                             and confirmation_status != 'confirmed';

select * from peers
where height > 0
order by height - blocks asc, response_time asc
limit 15;

select * from peers where blacklisted = true;

select * from peers where peer = "95.217.195.99:1984";
select count(distinct(peer)) from peers;

update peers set blacklisted = true where peer = "212.25.52.23:1984";
update peers set blacklisted = true where peer = "88.99.70.213:1984";
update peers set blacklisted = true where peer = "23.162.112.253:1984";
