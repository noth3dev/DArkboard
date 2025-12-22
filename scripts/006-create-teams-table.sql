-- 소규모 팀(그룹) 테이블 생성
CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자는 조회 가능
CREATE POLICY "Authenticated users can view teams"
  ON teams FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert teams"
  ON teams FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update teams"
  ON teams FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete teams"
  ON teams FOR DELETE
  TO authenticated
  USING (true);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_teams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER teams_updated_at_trigger
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_teams_updated_at();

-- 팀-멤버 연결 테이블
CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_uuid UUID NOT NULL REFERENCES users(user_uuid) ON DELETE CASCADE,
  role TEXT, -- 팀 내 역할 (예: 리더, 멤버 등)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_uuid)
);

-- RLS 활성화
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view team_members"
  ON team_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert team_members"
  ON team_members FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update team_members"
  ON team_members FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete team_members"
  ON team_members FOR DELETE
  TO authenticated
  USING (true);
