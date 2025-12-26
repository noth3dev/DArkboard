-- Add position column to user_groups table for ordering
ALTER TABLE user_groups ADD COLUMN IF NOT EXISTS position DOUBLE PRECISION DEFAULT 0;

-- Initialize position roughly based on joined_at so they aren't all 0
-- (Using epoch to get a somewhat increasing number)
UPDATE user_groups 
SET position = EXTRACT(EPOCH FROM joined_at);
