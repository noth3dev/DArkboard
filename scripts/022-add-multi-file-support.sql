-- Problems 및 Problem Submissions 테이블 확장 (다중 파일 지원)

-- 1. Problems 테이블에 files(JSONB) 컬럼 추가
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='problems' AND column_name='files') THEN
    ALTER TABLE problems ADD COLUMN files JSONB DEFAULT '{"index.html": {"code": "<!-- Write your code here -->"}}';
  END IF;
  
  -- 기존 initial_code는 하위 호환성을 위해 유지하거나 files로 마이그레이션 할 수 있음
END $$;

-- 2. Problem Submissions 테이블에 files(JSONB) 컬럼 추가
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='problem_submissions' AND column_name='files') THEN
    ALTER TABLE problem_submissions ADD COLUMN files JSONB DEFAULT '{}';
  END IF;
END $$;
