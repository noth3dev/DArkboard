-- 033-create-workspace-members-table.sql

-- Create workspace members table for access management
CREATE TABLE IF NOT EXISTS public.note_workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.note_workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),
    invited_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, user_id)
);

-- Enable RLS
ALTER TABLE public.note_workspace_members ENABLE ROW LEVEL SECURITY;

-- Policies for workspace members
-- Users can view members of workspaces they own or are members of
CREATE POLICY "Users can view workspace members"
    ON public.note_workspace_members FOR SELECT
    USING (
        user_id = auth.uid() OR
        workspace_id IN (
            SELECT id FROM public.note_workspaces WHERE user_id = auth.uid()
        ) OR
        workspace_id IN (
            SELECT workspace_id FROM public.note_workspace_members WHERE user_id = auth.uid()
        )
    );

-- Only workspace owners can add members
CREATE POLICY "Workspace owners can add members"
    ON public.note_workspace_members FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT id FROM public.note_workspaces WHERE user_id = auth.uid()
        )
    );

-- Workspace owners can update member roles
CREATE POLICY "Workspace owners can update members"
    ON public.note_workspace_members FOR UPDATE
    USING (
        workspace_id IN (
            SELECT id FROM public.note_workspaces WHERE user_id = auth.uid()
        )
    );

-- Workspace owners can remove members, or members can remove themselves
CREATE POLICY "Workspace owners or self can delete members"
    ON public.note_workspace_members FOR DELETE
    USING (
        user_id = auth.uid() OR
        workspace_id IN (
            SELECT id FROM public.note_workspaces WHERE user_id = auth.uid()
        )
    );

-- Update notes policies to allow shared access
DROP POLICY IF EXISTS "Users can view their own notes" ON public.notes;
CREATE POLICY "Users can view accessible notes"
    ON public.notes FOR SELECT
    USING (
        user_id = auth.uid() OR
        workspace_id IN (
            SELECT workspace_id FROM public.note_workspace_members 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update their own notes" ON public.notes;
CREATE POLICY "Users can update accessible notes"
    ON public.notes FOR UPDATE
    USING (
        user_id = auth.uid() OR
        workspace_id IN (
            SELECT workspace_id FROM public.note_workspace_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
        )
    );

-- Update workspace policies to allow shared access
DROP POLICY IF EXISTS "Users can view their own workspaces" ON public.note_workspaces;
CREATE POLICY "Users can view accessible workspaces"
    ON public.note_workspaces FOR SELECT
    USING (
        user_id = auth.uid() OR
        id IN (
            SELECT workspace_id FROM public.note_workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- Add indexes
CREATE INDEX IF NOT EXISTS note_workspace_members_workspace_id_idx ON public.note_workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS note_workspace_members_user_id_idx ON public.note_workspace_members(user_id);

-- Create updated_at trigger
CREATE TRIGGER set_note_workspace_members_updated_at
    BEFORE UPDATE ON public.note_workspace_members
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.note_workspace_members;
