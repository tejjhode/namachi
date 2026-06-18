-- ============================================================================
-- BOOTSTRAP SCRIPT - Run this ONCE in Supabase SQL Editor
-- ============================================================================

-- 1. Drop and recreate the exec_sql RPC function (allows backend to execute SQL)
DROP FUNCTION IF EXISTS public.exec_sql(text);

CREATE OR REPLACE FUNCTION public.exec_sql(query_text TEXT)
RETURNS void AS $$
BEGIN
  EXECUTE query_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.exec_sql(TEXT) TO authenticated, anon;

-- 2. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  role TEXT DEFAULT 'USER',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 3. Create trips table
CREATE TABLE IF NOT EXISTS public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  destination TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  start_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create leads table
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT DEFAULT 'new',
  assigned_to UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create lead_notes table
CREATE TABLE IF NOT EXISTS public.lead_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create activities table
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT,
  entity_id UUID,
  action TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- 8. Create policies
DROP POLICY IF EXISTS "Allow all profiles read" ON public.profiles;
CREATE POLICY "Allow all profiles read" ON public.profiles FOR SELECT USING (true);

-- 9. Create trigger function for new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, phone, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', new.phone, 'USER')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. Sync existing auth users to profiles
INSERT INTO public.profiles (id, email, full_name, avatar_url, phone, role)
SELECT id, email, raw_user_meta_data->>'full_name', raw_user_meta_data->>'avatar_url', phone, 'USER'
FROM auth.users
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email,
  phone = EXCLUDED.phone;

-- Done! You can now run: npm run dev
-- The app will auto-initialize all tables on startup
