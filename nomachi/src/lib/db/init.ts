import { supabase } from "@/lib/supabase/server";

// All migration SQL queries
const migrations = [
  // 1. Create profiles table
  `CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    role TEXT DEFAULT 'USER' CHECK (role IN ('ADMIN', 'USER', 'MANAGER', 'STAFF')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
  CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
  CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);`,

  // 2. Create trips table
  `CREATE TABLE IF NOT EXISTS public.trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    destination TEXT NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    price DECIMAL(10, 2),
    max_participants INTEGER,
    current_participants INTEGER DEFAULT 0,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    image_url TEXT,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_trips_status ON public.trips(status);
  CREATE INDEX IF NOT EXISTS idx_trips_destination ON public.trips(destination);
  CREATE INDEX IF NOT EXISTS idx_trips_start_date ON public.trips(start_date);
  CREATE INDEX IF NOT EXISTS idx_trips_created_by ON public.trips(created_by);`,

  // 3. Create leads table
  `CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'negotiating', 'converted', 'lost')),
    source TEXT,
    trip_interest UUID REFERENCES public.trips(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT,
    budget DECIMAL(10, 2),
    group_size INTEGER,
    travel_date TIMESTAMP WITH TIME ZONE,
    vibe_check_score INTEGER CHECK (vibe_check_score >= 0 AND vibe_check_score <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
  CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);
  CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads(assigned_to);
  CREATE INDEX IF NOT EXISTS idx_leads_trip_interest ON public.leads(trip_interest);
  CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at);`,

  // 4. Create lead_notes table
  `CREATE TABLE IF NOT EXISTS public.lead_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    note_type TEXT DEFAULT 'general' CHECK (note_type IN ('general', 'follow_up', 'meeting', 'call', 'email', 'internal')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ALTER TABLE IF EXISTS public.lead_notes ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
  CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id ON public.lead_notes(lead_id);
  CREATE INDEX IF NOT EXISTS idx_lead_notes_created_by ON public.lead_notes(created_by);
  CREATE INDEX IF NOT EXISTS idx_lead_notes_created_at ON public.lead_notes(created_at);`,

  // 5. Create traveler documents table
  `CREATE TABLE IF NOT EXISTS public.traveler_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
    traveler_index INTEGER NOT NULL DEFAULT 1,
    full_name TEXT NOT NULL,
    date_of_birth TEXT,
    gender TEXT,
    document_type TEXT,
    document_number TEXT,
    mobile_number TEXT,
    email TEXT,
    address TEXT,
    emergency_contact_name TEXT,
    emergency_contact_number TEXT,
    file_name TEXT,
    file_type TEXT,
    file_data_url TEXT,
    status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_traveler_documents_lead_id ON public.traveler_documents(lead_id);
  CREATE INDEX IF NOT EXISTS idx_traveler_documents_user_id ON public.traveler_documents(user_id);
  CREATE INDEX IF NOT EXISTS idx_traveler_documents_trip_id ON public.traveler_documents(trip_id);
  CREATE INDEX IF NOT EXISTS idx_traveler_documents_created_at ON public.traveler_documents(created_at);
  ALTER TABLE public.traveler_documents ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "traveler_documents_select_owner_or_manager" ON public.traveler_documents;
  CREATE POLICY "traveler_documents_select_owner_or_manager" ON public.traveler_documents
    FOR SELECT USING (
      auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND LOWER(p.role) IN ('manager', 'admin')
      )
    );
  DROP POLICY IF EXISTS "traveler_documents_insert_owner" ON public.traveler_documents;
  CREATE POLICY "traveler_documents_insert_owner" ON public.traveler_documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);
  DROP POLICY IF EXISTS "traveler_documents_update_owner_or_manager" ON public.traveler_documents;
  CREATE POLICY "traveler_documents_update_owner_or_manager" ON public.traveler_documents
    FOR UPDATE USING (
      auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND LOWER(p.role) IN ('manager', 'admin')
      )
    ) WITH CHECK (
      auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND LOWER(p.role) IN ('manager', 'admin')
      )
    );`,

  // 6. Create activities table
  `CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('lead', 'trip', 'profile')),
    entity_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'assigned', 'status_changed', 'noted')),
    performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    changes JSONB,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_activities_entity ON public.activities(entity_type, entity_id);
  CREATE INDEX IF NOT EXISTS idx_activities_performed_by ON public.activities(performed_by);
  CREATE INDEX IF NOT EXISTS idx_activities_action ON public.activities(action);
  CREATE INDEX IF NOT EXISTS idx_activities_created_at ON public.activities(created_at);`,

  // 7. Enable RLS and create policies
  `ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.trips ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.leads ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.lead_notes ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.traveler_documents ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.activities ENABLE ROW LEVEL SECURITY;
  
  DROP POLICY IF EXISTS "Allow all profiles read" ON public.profiles;
  CREATE POLICY "Allow all profiles read" ON public.profiles FOR SELECT USING (true);`,

  // 8. Create trigger for new user signup
  `CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER AS $$
  BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url, phone, role)
    VALUES (
      new.id,
      new.email,
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'avatar_url',
      new.phone,
      'USER'
    );
    RETURN new;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();`,

  // 9. Sync existing auth users to profiles
  `INSERT INTO public.profiles (id, email, full_name, avatar_url, phone, role, is_active)
  SELECT 
    id,
    email,
    raw_user_meta_data->>'full_name' as full_name,
    raw_user_meta_data->>'avatar_url' as avatar_url,
    phone,
    'USER' as role,
    true as is_active
  FROM auth.users
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    phone = EXCLUDED.phone;`,

  // 10. Create chat_messages table (encrypted real-time chat)
  `CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'team')),
    content_encrypted TEXT NOT NULL,
    iv TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_chat_messages_lead_id ON public.chat_messages(lead_id);
  CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);
  ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "chat_read_own" ON public.chat_messages;
  CREATE POLICY "chat_read_own" ON public.chat_messages FOR SELECT
    USING (
      lead_id IS NULL OR
      lead_id IN (SELECT id FROM public.leads WHERE email = (auth.jwt()->>'email'))
    );
  DROP POLICY IF EXISTS "chat_insert_own" ON public.chat_messages;
  CREATE POLICY "chat_insert_own" ON public.chat_messages FOR INSERT
    WITH CHECK (
      sender_type = 'user' AND (
        lead_id IS NULL OR
        lead_id IN (SELECT id FROM public.leads WHERE email = (auth.jwt()->>'email'))
      )
    );`,
];

export async function initializeDatabase() {
  try {
    console.log("🗄️  Initializing database schema...");

    for (let i = 0; i < migrations.length; i++) {
      try {
        await supabase.rpc("exec_sql", { query_text: migrations[i] });
        console.log(`✓ Migration ${i + 1}/${migrations.length} completed`);
      } catch (error: any) {
        // Some migrations might fail if objects already exist, which is OK
        if (error.message?.includes("already exists") || error.message?.includes("does not exist")) {
          console.log(`✓ Migration ${i + 1}/${migrations.length} (already exists)`);
        } else {
          console.warn(`⚠ Migration ${i + 1}/${migrations.length} warning:`, error.message);
        }
      }
    }

    // Reload schema cache so PostgREST immediately notices new tables/changes
    try {
      await supabase.rpc("exec_sql", { query_text: "NOTIFY pgrst, 'reload schema';" });
      console.log("✓ Reloaded PostgREST schema cache");
    } catch (reloadErr: any) {
      console.warn("⚠ PostgREST schema cache reload warning:", reloadErr.message);
    }

    console.log("✅ Database initialization complete!");
    return true;
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    return false;
  }
}
