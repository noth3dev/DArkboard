-- Add project_name column to legacy_records table
ALTER TABLE public.legacy_records ADD COLUMN IF NOT EXISTS project_name TEXT;
