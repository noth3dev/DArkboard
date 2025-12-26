-- Homework 및 Submission 테이블 생성

-- 1. Homeworks 테이블 (과제/숙제 정보)
CREATE TABLE IF NOT EXISTS homeworks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id UUID REFERENCES public.users(user_uuid) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  priority TEXT DEFAULT 'medium', -- low, medium, high
  subject TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Homework Submissions 테이블 (멘티 제출물)
CREATE TABLE IF NOT EXISTS homework_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  homework_id UUID REFERENCES public.homeworks(id) ON DELETE CASCADE,
  mentee_id UUID REFERENCES public.users(user_uuid) ON DELETE CASCADE,
  content TEXT, -- 제출 내용 (코드 또는 텍스트)
  status TEXT DEFAULT 'pending', -- pending, reviewed, completed
  feedback TEXT, -- 멘토의 피드백
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(homework_id, mentee_id) -- 과제당 한 번만 제출 가능하도록
);

-- RLS 활성화
ALTER TABLE homeworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_submissions ENABLE ROW LEVEL SECURITY;

-- Homeworks 정책
CREATE POLICY "Anyone can view homeworks"
  ON homeworks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Mentors can insert homeworks"
  ON homeworks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_uuid = auth.uid() AND role = 'mentor'
    )
  );

CREATE POLICY "Mentors can update own homeworks"
  ON homeworks FOR UPDATE
  TO authenticated
  USING (mentor_id = auth.uid());

CREATE POLICY "Mentors can delete own homeworks"
  ON homeworks FOR DELETE
  TO authenticated
  USING (mentor_id = auth.uid());

-- Submissions 정책
CREATE POLICY "Mentees can view own submissions"
  ON homework_submissions FOR SELECT
  TO authenticated
  USING (mentee_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.homeworks
    WHERE homeworks.id = homework_submissions.homework_id AND homeworks.mentor_id = auth.uid()
  ));

CREATE POLICY "Mentees can insert own submissions"
  ON homework_submissions FOR INSERT
  TO authenticated
  WITH CHECK (mentee_id = auth.uid());

CREATE POLICY "Mentees can update own submissions"
  ON homework_submissions FOR UPDATE
  TO authenticated
  USING (mentee_id = auth.uid());

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_homework_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER homeworks_updated_at_trigger
  BEFORE UPDATE ON homeworks
  FOR EACH ROW
  EXECUTE FUNCTION update_homework_updated_at();

CREATE TRIGGER homework_submissions_updated_at_trigger
  BEFORE UPDATE ON homework_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_homework_updated_at();
