-- 프로젝트-멤버 연결 테이블 (다대다 관계)
CREATE TABLE IF NOT EXISTS project_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_uuid UUID NOT NULL REFERENCES users(user_uuid) ON DELETE CASCADE,
  role TEXT, -- 프로젝트 내 역할 (예: PM, Developer, Designer 등)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_uuid)
);

-- RLS 활성화
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자는 조회 가능
CREATE POLICY "Authenticated users can view project_members"
  ON project_members FOR SELECT
  TO authenticated
  USING (true);

-- 인증된 사용자는 추가/수정/삭제 가능 (서버사이드에서 access_level 체크)
CREATE POLICY "Authenticated users can insert project_members"
  ON project_members FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update project_members"
  ON project_members FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete project_members"
  ON project_members FOR DELETE
  TO authenticated
  USING (true);
