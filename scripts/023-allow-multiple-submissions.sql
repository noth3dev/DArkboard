-- Problem Submissions 제약 조건 수정: 제출할 때마다 새 레코드가 생성되도록 기존의 UNIQUE 제약 조건을 삭제합니다.

ALTER TABLE problem_submissions DROP CONSTRAINT IF EXISTS problem_submissions_problem_id_mentee_id_key;
