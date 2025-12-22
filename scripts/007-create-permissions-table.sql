-- 권한 설정 테이블
CREATE TABLE IF NOT EXISTS permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  permission_key TEXT NOT NULL UNIQUE, -- 권한 식별자 (예: 'view_dashboard', 'edit_data')
  permission_name TEXT NOT NULL, -- 표시 이름 (예: '대시보드 접근')
  description TEXT, -- 권한 설명
  level_0 BOOLEAN DEFAULT false, -- Level I 권한 여부
  level_1 BOOLEAN DEFAULT false, -- Level II 권한 여부
  level_2 BOOLEAN DEFAULT true, -- Level III 권한 여부 (관리자는 기본 true)
  sort_order INTEGER DEFAULT 0, -- 정렬 순서
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자가 조회 가능
CREATE POLICY "Authenticated users can view permissions"
  ON permissions FOR SELECT
  TO authenticated
  USING (true);

-- Level 2만 수정 가능 (서버사이드에서 체크)
CREATE POLICY "Authenticated users can update permissions"
  ON permissions FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert permissions"
  ON permissions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER permissions_updated_at_trigger
  BEFORE UPDATE ON permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_permissions_updated_at();

-- 기본 권한 데이터 삽입
INSERT INTO permissions (permission_key, permission_name, description, level_0, level_1, level_2, sort_order) VALUES
  ('view_dashboard', '대시보드 접근', '메인 대시보드 페이지 접근', true, true, true, 1),
  ('view_pages', '팀/프로젝트/지출 페이지 접근', '팀, 프로젝트, 지출 페이지 접근', false, true, true, 2),
  ('edit_data', '데이터 추가/수정', '팀, 프로젝트, 지출 데이터 추가 및 수정', false, true, true, 3),
  ('delete_data', '데이터 삭제', '팀, 프로젝트, 지출 데이터 삭제', false, false, true, 4),
  ('view_management', '관리 페이지 접근', '권한 및 사용자 관리 페이지 접근', false, false, true, 5),
  ('edit_permissions', '권한 설정 수정', '권한 설정 변경', false, false, true, 6),
  ('edit_user_level', '사용자 레벨 변경', '다른 사용자의 접근 레벨 변경', false, false, true, 7)
ON CONFLICT (permission_key) DO NOTHING;
