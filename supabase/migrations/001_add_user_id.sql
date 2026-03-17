-- Migration: Add user_id to food_logs and settings for multi-user isolation
-- Foods and serving_sizes remain shared (global catalog)

-- 1. Add user_id columns (nullable first for backfill)
ALTER TABLE food_logs ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE settings ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- 2. Backfill existing rows to the first auth user
UPDATE food_logs SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;
UPDATE settings SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;

-- 3. Make user_id NOT NULL
ALTER TABLE food_logs ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE settings ALTER COLUMN user_id SET NOT NULL;

-- 4. Update settings unique constraint to composite (user_id, key)
-- Drop existing primary key on settings, replace with composite
ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_pkey;
ALTER TABLE settings ADD CONSTRAINT settings_pkey PRIMARY KEY (user_id, key);

-- 5. Add indexes
CREATE INDEX idx_food_logs_user_id ON food_logs(user_id);
CREATE INDEX idx_food_logs_user_date ON food_logs(user_id, date);
CREATE INDEX idx_settings_user_id ON settings(user_id);

-- 6. Enable RLS
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- 7. RLS policies for food_logs
CREATE POLICY "Users can view own logs" ON food_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own logs" ON food_logs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own logs" ON food_logs FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own logs" ON food_logs FOR DELETE USING (user_id = auth.uid());

-- 8. RLS policies for settings
CREATE POLICY "Users can view own settings" ON settings FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own settings" ON settings FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own settings" ON settings FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own settings" ON settings FOR DELETE USING (user_id = auth.uid());
