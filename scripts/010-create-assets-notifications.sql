-- 프로젝트 에셋(파일/링크) 테이블
CREATE TABLE IF NOT EXISTS project_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES project_tasks(id) ON DELETE CASCADE, -- 특정 태스크에 연결된 경우
  name TEXT NOT NULL,
  url TEXT NOT NULL, -- 파일 URL 또는 웹 링크
  type TEXT NOT NULL DEFAULT 'link', -- 'link', 'image', 'document', 'other'
  added_by UUID NOT NULL REFERENCES users(user_uuid),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 알림 테이블
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_uuid UUID NOT NULL REFERENCES users(user_uuid) ON DELETE CASCADE, -- 알림을 받는 사람
  actor_uuid UUID REFERENCES users(user_uuid) ON DELETE SET NULL, -- 행동을 한 사람 (예: 태스크 할당자)
  type TEXT NOT NULL, -- 'task_assigned', 'status_changed', 'new_member'
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES project_tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL, -- 알림 메시지
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE project_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 에셋 RLS: 모든 인증된 사용자가 조회 및 추가 가능
CREATE POLICY "Authenticated users can view project_assets" ON project_assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can add project_assets" ON project_assets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can delete own assets" ON project_assets FOR DELETE TO authenticated USING (auth.uid() = added_by);

-- 알림 RLS: 자신의 알림만 조회, 수정, 삭제 가능
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT TO authenticated USING (auth.uid() = recipient_uuid);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = recipient_uuid);
CREATE POLICY "Users can delete own notifications" ON notifications FOR DELETE TO authenticated USING (auth.uid() = recipient_uuid);
CREATE POLICY "System/Users can insert notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
