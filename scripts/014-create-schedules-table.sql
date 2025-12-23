-- 일정(스케줄) 테이블
CREATE TABLE IF NOT EXISTS schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_uuid UUID REFERENCES users(user_uuid) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  color TEXT DEFAULT '#3b82f6', -- 기본 파란색
  is_all_day BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- 자신의 것만 CRUD 가능하게 (관리자 로직은 나중에 추가 가능하지만 일단 LV2 사용자 자신의 일정 기준)
-- 하지만 LV2 사용자들끼리 서로 일정을 볼 필요가 있을 수도 있음.
-- 일단은 모든 인증된 사용자가 조회 가능하게 하고, 수정/삭제만 본인 혹은 상위 권한자가 가능하게 설정.

CREATE POLICY "Authenticated users can view schedules"
  ON schedules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own schedules"
  ON schedules FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_uuid);

CREATE POLICY "Users can update their own schedules"
  ON schedules FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_uuid OR (SELECT access_level FROM users WHERE user_uuid = auth.uid()) >= 2);

CREATE POLICY "Users can delete their own schedules"
  ON schedules FOR DELETE
  TO authenticated
  USING (auth.uid() = user_uuid OR (SELECT access_level FROM users WHERE user_uuid = auth.uid()) >= 2);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER schedules_updated_at_trigger
  BEFORE UPDATE ON schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_schedules_updated_at();
