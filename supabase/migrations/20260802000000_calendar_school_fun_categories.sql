-- Add school and fun calendars to household calendar_events categories.

ALTER TABLE public.calendar_events
  DROP CONSTRAINT IF EXISTS calendar_events_category_check;

ALTER TABLE public.calendar_events
  ADD CONSTRAINT calendar_events_category_check
  CHECK (
    category IN (
      'appointment',
      'school',
      'fun',
      'date',
      'birthday',
      'holiday',
      'household',
      'reminder',
      'trip',
      'other'
    )
  );
