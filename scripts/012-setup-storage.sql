-- 1. Storage bucket 생성 (project-assets)
-- Supabase에서 자동으로 buckets 테이블에 insert가 안될 경우를 대비해 SQL로 시도
INSERT INTO storage.buckets (id, name, public) 
VALUES ('project-assets', 'project-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage RLS 정책 설정 (project-assets 버킷에 대해)

-- 파일 조회: 누구나 가능 (public 버킷이므로)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'project-assets' );

-- 파일 업로드: 인증된 사용자만 가능
DROP POLICY IF EXISTS "Authenticated users can upload assets" ON storage.objects;
CREATE POLICY "Authenticated users can upload assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'project-assets' );

-- 파일 삭제: 본인이 올린 파일만 삭제 가능 (또는 관리자)
DROP POLICY IF EXISTS "Users can delete own assets" ON storage.objects;
CREATE POLICY "Users can delete own assets"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'project-assets' AND (auth.uid() = owner OR (SELECT access_level FROM public.users WHERE user_uuid = auth.uid()) >= 2) );
