-- Add project_id column to legacy_records table to link with projects
ALTER TABLE public.legacy_records ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
