-- Create many-to-many relationship for project task assignees
CREATE TABLE IF NOT EXISTS project_task_assignees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  user_uuid UUID NOT NULL REFERENCES users(user_uuid) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, user_uuid)
);

-- Enable RLS
ALTER TABLE project_task_assignees ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view project_task_assignees"
  ON project_task_assignees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert project_task_assignees"
  ON project_task_assignees FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete project_task_assignees"
  ON project_task_assignees FOR DELETE
  TO authenticated
  USING (true);

-- Migrate existing assignee_uuid data to the new table
INSERT INTO project_task_assignees (task_id, user_uuid)
SELECT id, assignee_uuid
FROM project_tasks
WHERE assignee_uuid IS NOT NULL
ON CONFLICT DO NOTHING;

-- Note: We keep assignee_uuid in project_tasks for backward compatibility (optional) 
-- but we will primarily use the new table moving forward.
