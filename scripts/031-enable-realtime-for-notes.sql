-- 031-enable-realtime-for-notes.sql

-- Check if publication exists (standard Supabase setup usually has it)
-- We'll attempt to add the table. If the publication doesn't exist, we should create it first.
-- However, standard practice in Supabase is to assume 'supabase_realtime' exists.

BEGIN;
  -- Add notes table to the publication
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;
COMMIT;
