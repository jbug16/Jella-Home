-- Milestone 9: Subscriptions tracker slice
-- - Expand cadence CHECK (bimonthly, semiannual)
-- - Lifecycle: active | archived only (migrate paused/canceled)
-- - billing_day for month-end / 29–31 stability
-- - List index (household_id, status, renewal_on)

-- ---------------------------------------------------------------------------
-- billing_day
-- ---------------------------------------------------------------------------
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS billing_day smallint;

UPDATE public.subscriptions
SET billing_day = CASE
  WHEN renewal_on IS NOT NULL THEN EXTRACT(DAY FROM renewal_on)::integer
  ELSE 1
END
WHERE billing_day IS NULL;

ALTER TABLE public.subscriptions
  ALTER COLUMN billing_day SET DEFAULT 1;

ALTER TABLE public.subscriptions
  ALTER COLUMN billing_day SET NOT NULL;

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_billing_day_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_billing_day_check
  CHECK (billing_day >= 1 AND billing_day <= 31);

-- ---------------------------------------------------------------------------
-- status: active | archived
-- ---------------------------------------------------------------------------
UPDATE public.subscriptions
SET status = 'archived'
WHERE status IN ('paused', 'canceled');

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('active', 'archived'));

ALTER TABLE public.subscriptions
  ALTER COLUMN status SET DEFAULT 'active';

-- ---------------------------------------------------------------------------
-- cadence: six fixed values
-- ---------------------------------------------------------------------------
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_cadence_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_cadence_check
  CHECK (
    cadence IN (
      'weekly',
      'monthly',
      'bimonthly',
      'quarterly',
      'semiannual',
      'yearly'
    )
  );

-- ---------------------------------------------------------------------------
-- indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS subscriptions_household_status_renewal_idx
  ON public.subscriptions (household_id, status, renewal_on);
