-- 프로젝트 테이블 생성
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'planning' CHECK (status IN ('active', 'development', 'planning', 'archived')),
  url TEXT,
  tags TEXT[] DEFAULT '{}',
  deadline DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자는 조회 가능
CREATE POLICY "Authenticated users can view projects"
  ON projects FOR SELECT
  TO authenticated
  USING (true);

-- access_level 1 이상 사용자만 추가/수정 가능 (별도 RPC나 서버사이드에서 처리)
CREATE POLICY "Authenticated users can insert projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (true);

-- access_level 2 이상만 삭제 가능 (서버사이드에서 체크)
CREATE POLICY "Authenticated users can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (true);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at_trigger
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_projects_updated_at();
