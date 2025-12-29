-- Migration: Add yjs_state column for real-time collaboration
-- The y-supabase library stores Yjs document state in this column

-- Add yjs_state column to store Yjs document binary data
ALTER TABLE notes ADD COLUMN IF NOT EXISTS yjs_state BYTEA;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notes_yjs_state ON notes(id) WHERE yjs_state IS NOT NULL;
