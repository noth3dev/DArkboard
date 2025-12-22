-- users 테이블 RLS 정책 설정
-- users 테이블 구조:
-- user_uuid, display_name, access_level, name, phone, role, name_eng

-- RLS 활성화 (이미 되어있으면 무시됨)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (충돌 방지)
DROP POLICY IF EXISTS "Users can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update users" ON public.users;

-- SELECT 정책: 모든 인증된 사용자가 조회 가능
CREATE POLICY "Users can view all users"
  ON public.users FOR SELECT
  TO authenticated
  USING (true);

-- INSERT 정책: 자신의 프로필만 생성 가능
CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_uuid);

-- UPDATE 정책: 모든 인증된 사용자가 수정 가능 (앱에서 권한 체크)
CREATE POLICY "Users can update users"
  ON public.users FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
