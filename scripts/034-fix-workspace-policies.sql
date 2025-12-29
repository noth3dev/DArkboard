-- 034-fix-workspace-policies.sql
-- Fix infinite recursion in RLS policies

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view accessible workspaces" ON public.note_workspaces;
DROP POLICY IF EXISTS "Users can view workspace members" ON public.note_workspace_members;

-- Create a security definer function to check workspace membership without triggering RLS
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id UUID, uid UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.note_workspace_members
        WHERE workspace_id = ws_id AND user_id = uid
    );
END;
$$ LANGUAGE plpgsql;

-- Create a security definer function to check workspace ownership without triggering RLS
CREATE OR REPLACE FUNCTION public.is_workspace_owner(ws_id UUID, uid UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.note_workspaces
        WHERE id = ws_id AND user_id = uid
    );
END;
$$ LANGUAGE plpgsql;

-- Recreate workspace policy using the security definer function
CREATE POLICY "Users can view accessible workspaces"
    ON public.note_workspaces FOR SELECT
    USING (
        user_id = auth.uid() OR 
        public.is_workspace_member(id, auth.uid())
    );

-- Recreate workspace members policy using the security definer function
CREATE POLICY "Users can view workspace members"
    ON public.note_workspace_members FOR SELECT
    USING (
        user_id = auth.uid() OR
        public.is_workspace_owner(workspace_id, auth.uid()) OR
        public.is_workspace_member(workspace_id, auth.uid())
    );

-- Also fix the notes policies if they have the same issue
DROP POLICY IF EXISTS "Users can view accessible notes" ON public.notes;
DROP POLICY IF EXISTS "Users can update accessible notes" ON public.notes;

CREATE POLICY "Users can view accessible notes"
    ON public.notes FOR SELECT
    USING (
        user_id = auth.uid() OR
        public.is_workspace_member(workspace_id, auth.uid())
    );

CREATE POLICY "Users can update accessible notes"
    ON public.notes FOR UPDATE
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.note_workspace_members
            WHERE workspace_id = notes.workspace_id 
            AND user_id = auth.uid() 
            AND role IN ('owner', 'editor')
        )
    );
