-- Countdown colors and drop unused notes.

ALTER TABLE public.countdowns
  ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT 'teal';

ALTER TABLE public.countdowns
  DROP CONSTRAINT IF EXISTS countdowns_color_check;

ALTER TABLE public.countdowns
  ADD CONSTRAINT countdowns_color_check
  CHECK (
    color IN ('teal', 'rose', 'amber', 'violet', 'sky', 'emerald')
  );

ALTER TABLE public.countdowns
  DROP COLUMN IF EXISTS notes;

ALTER TABLE public.countdowns
  DROP CONSTRAINT IF EXISTS countdowns_notes_len;
