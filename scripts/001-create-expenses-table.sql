-- 지출 항목 테이블 생성
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  item TEXT NOT NULL,
  amount DECIMAL(12, 0) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽을 수 있도록 정책 설정
CREATE POLICY "Allow public read access" ON expenses
  FOR SELECT USING (true);

-- 모든 사용자가 삽입할 수 있도록 정책 설정
CREATE POLICY "Allow public insert access" ON expenses
  FOR INSERT WITH CHECK (true);

-- 모든 사용자가 수정할 수 있도록 정책 설정
CREATE POLICY "Allow public update access" ON expenses
  FOR UPDATE USING (true);

-- 모든 사용자가 삭제할 수 있도록 정책 설정
CREATE POLICY "Allow public delete access" ON expenses
  FOR DELETE USING (true);
