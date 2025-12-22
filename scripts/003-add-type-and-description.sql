-- 기존 테이블에 type과 description 컬럼 추가
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'expense' CHECK (type IN ('income', 'expense')),
ADD COLUMN IF NOT EXISTS description TEXT;

-- 기존 데이터는 모두 expense로 설정
UPDATE expenses SET type = 'expense' WHERE type IS NULL;
