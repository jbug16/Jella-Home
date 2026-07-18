-- Covering index for the transactions -> budget_categories foreign key.
-- The earlier fk_indexes migration covered other foreign keys but missed
-- transactions.category_id; the hosted Performance Advisor flags it as an
-- unindexed foreign key. Category filtering/joins on transactions benefit from
-- this index.

CREATE INDEX IF NOT EXISTS transactions_category_id_idx
  ON public.transactions (category_id);
