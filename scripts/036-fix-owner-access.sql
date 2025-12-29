-- 036-fix-owner-access.sql
-- Implement Workspace-Based Access Control: 
-- "If you have access to a workspace, you have access to all documents within it."

-- 1. Redefine 'SELECT' policy
DROP POLICY IF EXISTS "Users can view accessible notes" ON public.notes;
CREATE POLICY "Users can view accessible notes"
    ON public.notes FOR SELECT
    USING (
        user_id = auth.uid() OR
        public.is_workspace_owner(workspace_id, auth.uid()) OR
        public.is_workspace_member(workspace_id, auth.uid())
    );

-- 2. Redefine 'UPDATE' policy
DROP POLICY IF EXISTS "Users can update accessible notes" ON public.notes;
CREATE POLICY "Users can update accessible notes"
    ON public.notes FOR UPDATE
    USING (
        user_id = auth.uid() OR
        public.is_workspace_owner(workspace_id, auth.uid()) OR
        public.is_workspace_member(workspace_id, auth.uid())
    );

-- 3. Redefine 'DELETE' policy
DROP POLICY IF EXISTS "Users can delete their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can delete accessible notes" ON public.notes;
CREATE POLICY "Users can delete accessible notes"
    ON public.notes FOR DELETE
    USING (
        user_id = auth.uid() OR
        public.is_workspace_owner(workspace_id, auth.uid()) OR
        public.is_workspace_member(workspace_id, auth.uid())
    );

-- 4. Redefine 'INSERT' policy
DROP POLICY IF EXISTS "Users can create their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can create notes in accessible workspaces" ON public.notes;
CREATE POLICY "Users can create notes in accessible workspaces"
    ON public.notes FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND (
            workspace_id IS NULL OR
            public.is_workspace_owner(workspace_id, auth.uid()) OR
            public.is_workspace_member(workspace_id, auth.uid())
        )
    );
