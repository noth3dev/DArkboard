-- Problems 및 Problem Submissions 테이블 생성

-- 1. Problems 테이블 (Homework 하위 문제)
CREATE TABLE IF NOT EXISTS problems (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  homework_id UUID REFERENCES public.homeworks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  submission_format TEXT NOT NULL DEFAULT 'code', -- code, file, quiz
  initial_code TEXT, -- 코드 에디터 초기값
  quiz_options JSONB, -- 퀴즈일 경우 선택지 등
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Problem Submissions 테이블 (기존 homework_submissions를 대체하거나 확장)
-- 여기서는 새로운 테이블을 만들어 문제별 제출을 관리합니다.
CREATE TABLE IF NOT EXISTS problem_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  problem_id UUID REFERENCES public.problems(id) ON DELETE CASCADE,
  mentee_id UUID REFERENCES public.users(user_uuid) ON DELETE CASCADE,
  content TEXT, -- 제출 내용
  status TEXT DEFAULT 'pending', -- pending, reviewed, completed
  feedback TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(problem_id, mentee_id)
);

-- RLS 활성화
ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE problem_submissions ENABLE ROW LEVEL SECURITY;

-- Problems 정책
CREATE POLICY "Anyone can view problems"
  ON problems FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Mentors can manage problems"
  ON problems FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.homeworks h
      JOIN public.users u ON u.user_uuid = auth.uid()
      WHERE h.id = problems.homework_id AND u.role = 'mentor'
    )
  );

-- Problem Submissions 정책
CREATE POLICY "Users can view relevant submissions"
  ON problem_submissions FOR SELECT
  TO authenticated
  USING (
    mentee_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.problems p
      JOIN public.homeworks h ON h.id = p.homework_id
      WHERE p.id = problem_submissions.problem_id AND h.mentor_id = auth.uid()
    )
  );

CREATE POLICY "Mentees can submit"
  ON problem_submissions FOR INSERT
  TO authenticated
  WITH CHECK (mentee_id = auth.uid());

CREATE POLICY "Mentees can update own submission"
  ON problem_submissions FOR UPDATE
  TO authenticated
  USING (mentee_id = auth.uid());

CREATE POLICY "Mentors can update feedback"
  ON problem_submissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.problems p
      JOIN public.homeworks h ON h.id = p.homework_id
      WHERE p.id = problem_submissions.problem_id AND h.mentor_id = auth.uid()
    )
  );

-- 트리거
CREATE TRIGGER problems_updated_at_trigger
  BEFORE UPDATE ON problems
  FOR EACH ROW
  EXECUTE FUNCTION update_homework_updated_at();

CREATE TRIGGER problem_submissions_updated_at_trigger
  BEFORE UPDATE ON problem_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_homework_updated_at();
