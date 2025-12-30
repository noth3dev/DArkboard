-- 038-add-color-to-workspace-members.sql

-- Add color column to note_workspace_members with a default
ALTER TABLE public.note_workspace_members 
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#2196F3';

-- Update existing members with a default color if needed
UPDATE public.note_workspace_members 
SET color = '#2196F3' 
WHERE color IS NULL;

-- Notify PostgREST of the schema change
NOTIFY pgrst, 'reload schema';
