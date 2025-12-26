-- Create homework_assignees table
CREATE TABLE IF NOT EXISTS homework_assignees (
  homework_id UUID REFERENCES homeworks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(user_uuid) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (homework_id, user_id)
);

-- Enable RLS
ALTER TABLE homework_assignees ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view assignees"
  ON homework_assignees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Mentors can insert assignees"
  ON homework_assignees FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
        SELECT 1 FROM homeworks 
        WHERE id = homework_id AND mentor_id = auth.uid()
    )
  );

CREATE POLICY "Mentors can delete assignees"
  ON homework_assignees FOR DELETE
  TO authenticated
  USING (
    EXISTS (
        SELECT 1 FROM homeworks 
        WHERE id = homework_id AND mentor_id = auth.uid()
    )
  );
