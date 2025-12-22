-- 사용자 컬럼 추가
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS user TEXT;
