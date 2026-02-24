-- নূর-আল-ইসলাম ডাটাবেস স্কিমা

-- ইউজার প্রোফাইল টেবিল
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- রক্তদাতা টেবিল
CREATE TABLE IF NOT EXISTS blood_donors (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  blood_group TEXT NOT NULL,
  location TEXT NOT NULL,
  contact TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- নামাজ ট্র্যাকার টেবিল
CREATE TABLE IF NOT EXISTS prayer_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  prayer_name TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE
);

-- দৈনিক রিমাইন্ডার টেবিল
CREATE TABLE IF NOT EXISTS daily_reminders (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  author TEXT DEFAULT 'অ্যাডমিন',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS এনাবল করা
ALTER TABLE blood_donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reminders ENABLE ROW LEVEL SECURITY;

-- পলিসি সেটআপ
CREATE POLICY "Public read donors" ON blood_donors FOR SELECT USING (true);
CREATE POLICY "Public insert donors" ON blood_donors FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage donors" ON blood_donors FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Users view own logs" ON prayer_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own logs" ON prayer_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own logs" ON prayer_logs FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Public profiles access" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Public read reminders" ON daily_reminders FOR SELECT USING (true);
CREATE POLICY "Admins manage reminders" ON daily_reminders FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);