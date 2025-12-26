-- Lectures 테이블 생성 및 Homeworks 테이블 확장

-- 1. Lectures 테이블
CREATE TABLE IF NOT EXISTS lectures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id UUID REFERENCES public.users(user_uuid) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT, -- 강의 링크
  thumbnail_url TEXT,
  category TEXT DEFAULT '기타',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Homeworks 테이블 확장 (이미 존재한다면 컬럼 추가)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='homeworks' AND column_name='lecture_id') THEN
    ALTER TABLE homeworks ADD COLUMN lecture_id UUID REFERENCES lectures(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='homeworks' AND column_name='submission_format') THEN
    ALTER TABLE homeworks ADD COLUMN submission_format TEXT DEFAULT 'code'; -- code, file, quiz
  END IF;
END $$;

-- RLS 활성화
ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;

-- Lectures 정책
CREATE POLICY "Anyone can view lectures"
  ON lectures FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Mentors can insert lectures"
  ON lectures FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_uuid = auth.uid() AND role = 'mentor'
    )
  );

CREATE POLICY "Mentors can update own lectures"
  ON lectures FOR UPDATE
  TO authenticated
  USING (mentor_id = auth.uid());

CREATE POLICY "Mentors can delete own lectures"
  ON lectures FOR DELETE
  TO authenticated
  USING (mentor_id = auth.uid());

-- updated_at 트리거
CREATE TRIGGER lectures_updated_at_trigger
  BEFORE UPDATE ON lectures
  FOR EACH ROW
  EXECUTE FUNCTION update_homework_updated_at();
