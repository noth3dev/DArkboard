-- 프로젝트 조회 권한을 더 엄격하게 제한
-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view public or joined projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can view projects" ON projects;

-- 새로운 조회 정책: 
-- 1. 공개 프로젝트 (is_public = true)
-- 2. 프로젝트 멤버인 경우
-- 3. 프로젝트 생성자인 경우
-- 4. 관리자 (access_level >= 4, Level IV)
CREATE POLICY "Users can view public or joined projects"
  ON projects FOR SELECT
  TO authenticated
  USING (
    is_public = true OR 
    id IN (SELECT project_id FROM project_members WHERE user_uuid = auth.uid()) OR
    created_by = auth.uid() OR
    (SELECT access_level FROM users WHERE user_uuid = auth.uid()) >= 4
  );
