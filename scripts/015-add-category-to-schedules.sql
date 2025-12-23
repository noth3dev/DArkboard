-- schedules 테이블에 category 컬럼 추가
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedules' AND column_name = 'category') THEN
    ALTER TABLE schedules ADD COLUMN category TEXT;
  END IF;
END $$;
