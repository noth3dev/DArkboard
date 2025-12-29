-- 032-create-workspaces-table.sql

-- Create workspaces table
CREATE TABLE IF NOT EXISTS public.note_workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'My Workspace',
    icon TEXT DEFAULT 'folder',
    color TEXT DEFAULT '#6B7280',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add workspace_id to notes table
ALTER TABLE public.notes 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.note_workspaces(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.note_workspaces ENABLE ROW LEVEL SECURITY;

-- Create policies for workspaces
CREATE POLICY "Users can create their own workspaces"
    ON public.note_workspaces FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own workspaces"
    ON public.note_workspaces FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own workspaces"
    ON public.note_workspaces FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workspaces"
    ON public.note_workspaces FOR DELETE
    USING (auth.uid() = user_id);

-- Create updated_at trigger for workspaces
CREATE TRIGGER set_note_workspaces_updated_at
    BEFORE UPDATE ON public.note_workspaces
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Add index for user_id on workspaces
CREATE INDEX IF NOT EXISTS note_workspaces_user_id_idx ON public.note_workspaces(user_id);

-- Add index for workspace_id on notes
CREATE INDEX IF NOT EXISTS notes_workspace_id_idx ON public.notes(workspace_id);

-- Enable realtime for workspaces
ALTER PUBLICATION supabase_realtime ADD TABLE public.note_workspaces;
