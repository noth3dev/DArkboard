-- 프로젝트 테이블에 공개 여부 및 생성자 필드 추가
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_uuid);

-- 기존 데이터 마이그레이션 (선택 사항: 기존 프로젝트들은 일단 공개로 설정)
UPDATE projects SET is_public = true WHERE is_public IS NULL;

-- RLS 정책 업데이트
DROP POLICY IF EXISTS "Users can view public or joined projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can create projects" ON projects;
DROP POLICY IF EXISTS "Owner or managers can update projects" ON projects;
DROP POLICY IF EXISTS "Owner or high level users can delete projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can view projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can insert projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can update projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can delete projects" ON projects;

-- 1. 조회 정책: 공개 프로젝트거나, 프로젝트 멤버이거나, 생성자이거나, 레벨 2 이상의 관리자
CREATE POLICY "Users can view public or joined projects"
  ON projects FOR SELECT
  TO authenticated
  USING (
    is_public = true OR 
    id IN (SELECT project_id FROM project_members WHERE user_uuid = auth.uid()) OR
    created_by = auth.uid() OR
    (SELECT access_level FROM users WHERE user_uuid = auth.uid()) >= 2
  );

-- 2. 삽입 정책: 모든 인증된 사용자가 프로젝트 생성 가능
CREATE POLICY "Authenticated users can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3. 수정 정책: 프로젝트 생성자이거나 매니저급 멤버이거나 레벨 2 이상의 관리자
CREATE POLICY "Owner or managers can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    id IN (SELECT project_id FROM project_members WHERE user_uuid = auth.uid() AND role = 'manager') OR
    (SELECT access_level FROM users WHERE user_uuid = auth.uid()) >= 2 OR
    created_by IS NULL -- 기존 데이터 배려: 생성자가 없는 경우 누구나(로그인 유저) 일단 수정 가능하게 하거나 관리자만 가능하게 조절
  );

-- 4. 삭제 정책: 생성자나 레벨 2 이상의 관리자
CREATE POLICY "Owner or high level users can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    (SELECT access_level FROM users WHERE user_uuid = auth.uid()) >= 2
  );
