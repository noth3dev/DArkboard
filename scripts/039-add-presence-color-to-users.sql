-- 039-add-presence-color-to-users.sql

-- Add presence_color column to public.users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS presence_color TEXT DEFAULT '#2196F3';

-- Notify PostgREST of the schema change
NOTIFY pgrst, 'reload schema';
