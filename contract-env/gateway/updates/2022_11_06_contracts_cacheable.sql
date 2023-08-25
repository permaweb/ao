ALTER table contracts
    ADD COLUMN cacheable bool DEFAULT false;
CREATE INDEX contracts_cacheable_index ON contracts (cacheable);

UPDATE contracts
SET cacheable = true
WHERE contract_id IN (
                      'qg5BIOUraunoi6XJzbCC-TgIAypcXyXlVprgg0zRRDE',
                      'Daj-MNSnH55TDfxqC7v4eq0lKzVIwh98srUaWqyuZtY',
                      '-8A6RexFkpfWwuyVO98wzSFZh0d6VJuI-buTJvlwOJQ',
                      '5Yt1IujBmOm1LSux9KDUTjCE7rJqepzP7gZKf_DyzWI');
