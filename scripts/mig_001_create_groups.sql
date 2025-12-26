-- Create groups table
CREATE TABLE IF NOT EXISTS groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_groups junction table
CREATE TABLE IF NOT EXISTS user_groups (
  user_id UUID REFERENCES users(user_uuid) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, group_id)
);

-- Enable RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_groups ENABLE ROW LEVEL SECURITY;

-- Policies (Adjust based on your actual auth requirements)
-- Allow read access to authenticated users
CREATE POLICY "Allow read access for all authenticated users" ON groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for all authenticated users" ON user_groups FOR SELECT TO authenticated USING (true);

-- Allow insert/update/delete for mentors (assuming 'mentor' role logic)
-- This might need adjustment based on how you handle roles in RLS. 
-- For now, allowing all authenticated to insert for demo purposes if specific role check isn't strictly enforced in DB yet.
CREATE POLICY "Allow all access for authenticated users" ON groups FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access for authenticated users" ON user_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);
