-- 037-create-note-attachments.sql
-- Create note attachments storage and tracking

-- 1. Storage bucket for note attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'note-attachments', 
    'note-attachments', 
    true, 
    52428800, -- 50MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'video/mp4', 'video/webm', 'video/quicktime', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET 
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Create note_attachments table to track uploaded files
CREATE TABLE IF NOT EXISTS public.note_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.note_workspaces(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    storage_object_id UUID,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.note_attachments ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for note_attachments

-- View: Can view if you have access to the workspace
CREATE POLICY "Users can view accessible attachments"
    ON public.note_attachments FOR SELECT
    USING (
        uploaded_by = auth.uid() OR
        workspace_id IN (
            SELECT workspace_id FROM public.note_workspace_members 
            WHERE user_id = auth.uid()
        ) OR
        workspace_id IN (
            SELECT id FROM public.note_workspaces WHERE user_id = auth.uid()
        )
    );

-- Insert: Can upload if you have editor access to the workspace
CREATE POLICY "Users can upload attachments to accessible workspaces"
    ON public.note_attachments FOR INSERT
    WITH CHECK (
        auth.uid() = uploaded_by AND (
            workspace_id IN (
                SELECT workspace_id FROM public.note_workspace_members 
                WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
            ) OR
            workspace_id IN (
                SELECT id FROM public.note_workspaces WHERE user_id = auth.uid()
            )
        )
    );

-- Update: Can update if you have editor access
CREATE POLICY "Users can update accessible attachments"
    ON public.note_attachments FOR UPDATE
    USING (
        uploaded_by = auth.uid() OR
        workspace_id IN (
            SELECT workspace_id FROM public.note_workspace_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
        ) OR
        workspace_id IN (
            SELECT id FROM public.note_workspaces WHERE user_id = auth.uid()
        )
    );

-- Delete: Workspace members with editor+ role can delete any attachment in workspace
CREATE POLICY "Workspace editors can delete attachments"
    ON public.note_attachments FOR DELETE
    USING (
        uploaded_by = auth.uid() OR
        workspace_id IN (
            SELECT workspace_id FROM public.note_workspace_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
        ) OR
        workspace_id IN (
            SELECT id FROM public.note_workspaces WHERE user_id = auth.uid()
        )
    );

-- 4. Storage Policies for note-attachments bucket

-- View: Public access for viewing/downloading
CREATE POLICY "Public can view note attachments"
ON storage.objects FOR SELECT
USING ( bucket_id = 'note-attachments' );

-- Upload: Authenticated users can upload to workspaces they have access to
CREATE POLICY "Authenticated users can upload note attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( 
    bucket_id = 'note-attachments' 
);

-- Update: Same as upload
CREATE POLICY "Authenticated users can update note attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'note-attachments' );

-- Delete: Workspace members can delete files
-- Check happens through the note_attachments table policies
CREATE POLICY "Authenticated users can delete note attachments"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'note-attachments' );

-- 5. Indexes
CREATE INDEX IF NOT EXISTS note_attachments_note_id_idx ON public.note_attachments(note_id);
CREATE INDEX IF NOT EXISTS note_attachments_workspace_id_idx ON public.note_attachments(workspace_id);
CREATE INDEX IF NOT EXISTS note_attachments_uploaded_by_idx ON public.note_attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS note_attachments_file_path_idx ON public.note_attachments(file_path);

-- 6. Trigger for updated_at
CREATE TRIGGER set_note_attachments_updated_at
    BEFORE UPDATE ON public.note_attachments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 7. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.note_attachments;
