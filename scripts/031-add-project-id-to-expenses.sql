-- 지출 항목에 프로젝트 ID 추가
ALTER TABLE expenses
ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- 인덱스 추가 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON expenses(project_id);
