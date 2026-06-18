// Migration SQL scripts
export const dbMigrations = [
  {
    name: "create_profiles",
    sql: `CREATE TABLE IF NOT EXISTS public.profiles (
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
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;`,
  },
  {
    name: "create_trips",
    sql: `CREATE TABLE IF NOT EXISTS public.trips (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      destination TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      image_url TEXT,
      start_date TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS image_url TEXT;
    CREATE INDEX IF NOT EXISTS idx_trips_status ON public.trips(status);
    ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;`,
  },
  {
    name: "create_leads",
    sql: `CREATE TABLE IF NOT EXISTS public.leads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      status TEXT DEFAULT 'new',
      assigned_to UUID,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
    ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;`,
  },
  {
    name: "create_lead_notes",
    sql: `CREATE TABLE IF NOT EXISTS public.lead_notes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id ON public.lead_notes(lead_id);
    ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;`,
  },
  {
    name: "create_activities",
    sql: `CREATE TABLE IF NOT EXISTS public.activities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      entity_type TEXT,
      entity_id UUID,
      action TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;`,
  },
  {
    name: "rls_policies",
    sql: `DROP POLICY IF EXISTS "Allow all profiles read" ON public.profiles;
    CREATE POLICY "Allow all profiles read" ON public.profiles FOR SELECT USING (true);`,
  },
  {
    name: "create_user_trigger",
    sql: `CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO public.profiles (id, email, full_name, avatar_url, phone, role)
      VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', new.phone, 'USER')
      ON CONFLICT (id) DO NOTHING;
      RETURN new;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();`,
  },
  {
    name: "sync_auth_users",
    sql: `INSERT INTO public.profiles (id, email, full_name, avatar_url, phone, role)
    SELECT id, email, raw_user_meta_data->>'full_name', raw_user_meta_data->>'avatar_url', phone, 'USER'
    FROM auth.users
    ON CONFLICT (id) DO UPDATE SET 
      email = EXCLUDED.email,
      phone = EXCLUDED.phone;`,
  },
  {
    name: "add_trip_image_url",
    sql: `ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS image_url TEXT;`,
  },
  {
    name: "add_lead_trip_id",
    sql: `ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL;`,
  },
  {
    name: "add_customer_rls_policies",
    sql: `DROP POLICY IF EXISTS "leads_select_customer_policy" ON public.leads;
    CREATE POLICY "leads_select_customer_policy" ON public.leads
      FOR SELECT USING (email = auth.jwt()->>'email');
    DROP POLICY IF EXISTS "lead_notes_select_customer_policy" ON public.lead_notes;
    CREATE POLICY "lead_notes_select_customer_policy" ON public.lead_notes
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.leads
          WHERE id = lead_id AND email = auth.jwt()->>'email'
        )
      );`,
  },
  {
    name: "add_trips_rls_policies",
    sql: `DROP POLICY IF EXISTS "Allow all trips read" ON public.trips;
    CREATE POLICY "Allow all trips read" ON public.trips FOR SELECT USING (true);`,
  },
  {
    name: "add_trip_detail_columns",
    sql: `ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS price NUMERIC;
    ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS duration TEXT;
    ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS rating NUMERIC;
    ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS reviews INTEGER;
    
    UPDATE public.trips SET price = 89999, duration = '7 Days', rating = 4.8, reviews = 124 WHERE title = 'Banff Escape';
    UPDATE public.trips SET price = 109999, duration = '6 Days', rating = 4.9, reviews = 98 WHERE title = 'Maldives Lagoon Getaway';
    UPDATE public.trips SET price = 79999, duration = '8 Days', rating = 4.7, reviews = 76 WHERE title = 'Bali Retreat & Temple Tour';
    UPDATE public.trips SET price = 119999, duration = '6 Days', rating = 4.8, reviews = 64 WHERE title = 'Santorini Caldera Sunset';
    UPDATE public.trips SET price = 129999, duration = '7 Days', rating = 4.9, reviews = 112 WHERE title = 'Tokyo Lights & Mt. Fuji';
    UPDATE public.trips SET price = 99999, duration = '7 Days', rating = 4.8, reviews = 50 WHERE title = 'Paris Romance & Seine Cruise';
    UPDATE public.trips SET price = 139999, duration = '6 Days', rating = 4.9, reviews = 88 WHERE title = 'Swiss Alps Winter Skiing';
    UPDATE public.trips SET price = 69999, duration = '5 Days', rating = 4.6, reviews = 45 WHERE title = 'Cairo Pyramids Explorer';
    UPDATE public.trips SET price = 139999, duration = '6 Days', rating = 4.9, reviews = 88 WHERE title = 'Reykjavik Northern Lights';
    UPDATE public.trips SET price = 119999, duration = '7 Days', rating = 4.7, reviews = 55 WHERE title = 'Sydney Harbour Discovery';`,
  },
  {
    name: "add_trip_details_rich_data",
    sql: `
      ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS itinerary JSONB;
      ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS inclusions TEXT[];
      ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS exclusions TEXT[];
      ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS accommodation TEXT;
      ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS faqs JSONB;
      ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS images TEXT[];
      ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS highlights TEXT[];
      ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS trip_style TEXT;
      ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS difficulty TEXT;
      ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS best_for TEXT;
      ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS age_group TEXT;
      ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS meals TEXT;
      ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS group_size TEXT;
      ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS seats_left INTEGER DEFAULT 6;
      ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS total_seats INTEGER DEFAULT 12;

      -- Seed Tokyo Lights & Mt. Fuji
      UPDATE public.trips SET
        description = 'Experience the magic of Japan — from the vibrant streets of Tokyo to the serene beauty of Mt. Fuji. This journey blends culture, adventure, and breathtaking landscapes for an unforgettable escape.',
        trip_style = 'City Explorer, Culture',
        difficulty = 'Easy',
        best_for = 'Solo, Friends, Couples',
        age_group = '18+',
        meals = 'Breakfast Included',
        group_size = 'Small Group (8–12)',
        seats_left = 6,
        total_seats = 12,
        highlights = ARRAY[
          'Explore Tokyo''s iconic landmarks',
          'Day trip to Mt. Fuji & Hakone',
          'Shinkansen (Bullet Train) experience',
          'Traditional Japanese experiences',
          'Free day for shopping & exploration'
        ],
        inclusions = ARRAY[
          '6 nights in premium 4-star hotels',
          'All breakfasts and 3 specialty dinners',
          'English-speaking local guide',
          'Bullet train ticket (Shinkansen)',
          'Entrance fees to all attractions in itinerary',
          'Airport transfers'
        ],
        exclusions = ARRAY[
          'International flights',
          'Personal travel insurance',
          'Lunch and optional activities',
          'Personal expenses'
        ],
        accommodation = 'Hotel Gracery Shinjuku (Tokyo) - 3 nights\nThe Thousand Kyoto (Kyoto) - 3 nights',
        images = ARRAY[
          'https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?auto=format&fit=crop&w=600&q=80'
        ],
        itinerary = '[
          {"day": 1, "title": "Arrival in Tokyo", "description": "Welcome to Japan! Arrive at Narita or Haneda Airport. Transfer to your premium hotel in Shinjuku and meet your guide and group for a welcome dinner."},
          {"day": 2, "title": "Tokyo Highlights: Shibuya & Harajuku", "description": "Explore the Meiji Shrine, walk through the bustling streets of Harajuku, cross the Shibuya Crossing, and admire Tokyo from above at Shibuya Sky."},
          {"day": 3, "title": "Historic Senso-ji & Akihabara", "description": "Dive into the history of Asakusa at the Senso-ji Temple. Afterwards, experience the modern pop-culture and electronics district of Akihabara."},
          {"day": 4, "title": "Day Trip to Mt. Fuji & Hakone", "description": "Travel to the Mt. Fuji fifth station for panoramic views. Take a scenic cable car in Hakone and cruise across Lake Ashi on a pirate ship."},
          {"day": 5, "title": "Shinkansen to Kyoto", "description": "Board the high-speed bullet train (Shinkansen) to Japan''s cultural capital, Kyoto. Check into your hotel and enjoy a peaceful evening stroll in Gion."},
          {"day": 6, "title": "Bamboo Groves & Golden Pavilion", "description": "Visit the iconic Arashiyama Bamboo Grove and the stunning Kinkaku-ji (Golden Pavilion). Take part in a traditional tea ceremony."},
          {"day": 7, "title": "Fushimi Inari & Departure", "description": "Hike through the thousands of vermilion torii gates at Fushimi Inari Shrine. Transfer to Kansai Airport or return to Tokyo for your flight home."}
        ]'::jsonb,
        faqs = '[
          {"question": "What is the group size?", "answer": "Our group size is kept small, between 8 to 12 travelers, to maintain an intimate and flexible experience."},
          {"question": "Are flights included?", "answer": "No, international flights to and from Japan are not included in the trip price."},
          {"question": "Is travel insurance mandatory?", "answer": "Yes, we require all participants to have comprehensive travel insurance covering medical emergencies."},
          {"question": "Can I join as a solo traveler?", "answer": "Absolutely! Many of our travelers join solo. You can choose to share a twin room with another traveler or pay a single supplement."}
        ]'::jsonb
      WHERE title = 'Tokyo Lights & Mt. Fuji';

      -- Seed other trips with fallback data to prevent null issues
      UPDATE public.trips SET
        description = COALESCE(description, 'Unveil the wonders of ' || destination || ' with our custom, hand-crafted itinerary designed to show you the best local spots and hidden treasures.'),
        trip_style = COALESCE(trip_style, 'Small Group, Explorer'),
        difficulty = COALESCE(difficulty, 'Easy'),
        best_for = COALESCE(best_for, 'Solo, Friends, Couples'),
        age_group = COALESCE(age_group, '18+'),
        meals = COALESCE(meals, 'Breakfast Included'),
        group_size = COALESCE(group_size, 'Small Group (8–12)'),
        seats_left = COALESCE(seats_left, 6),
        total_seats = COALESCE(total_seats, 12),
        highlights = COALESCE(highlights, ARRAY[
          'Explore iconic landmarks and scenic views',
          'Immerse yourself in authentic local experiences',
          'Enjoy premium guided tours with local experts',
          'Free time for shopping, relaxation and discovery'
        ]),
        inclusions = COALESCE(inclusions, ARRAY[
          'Premium hand-picked accommodation',
          'Daily breakfast and special dinners',
          'English-speaking tour coordinator',
          'All local transport and attraction entry tickets'
        ]),
        exclusions = COALESCE(exclusions, ARRAY[
          'International flights',
          'Personal travel insurance',
          'Lunch and optional activities'
        ]),
        accommodation = COALESCE(accommodation, 'Premium Boutique Hotels (3/4-star rating)'),
        images = COALESCE(images, ARRAY[
          image_url,
          'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80'
        ]),
        itinerary = COALESCE(itinerary, '[
          {"day": 1, "title": "Arrival & Welcome", "description": "Arrive at destination. Get picked up by our guide, check into hotel, and join for a group welcome dinner."},
          {"day": 2, "title": "Guided City Exploration", "description": "Full day guided tour covering all major historical sites, local markets and signature landmarks."},
          {"day": 3, "title": "Free Exploration Day", "description": "A day for shopping, relaxing, or embarking on optional excursions of your choice."},
          {"day": 4, "title": "Departure & Farewell", "description": "Enjoy breakfast, check out, and transfer to airport for your flight home."}
        ]'::jsonb),
        faqs = COALESCE(faqs, '[
          {"question": "What is the group size?", "answer": "Our group size is kept small, between 8 to 12 travelers, to maintain an intimate and flexible experience."},
          {"question": "Are flights included?", "answer": "No, international flights are not included in the trip price."}
        ]'::jsonb)
      WHERE description IS NULL OR trip_style IS NULL;
    `,
  },
  {
    name: "add_detailed_enquiry_columns_to_leads",
    sql: `
      ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS group_type TEXT;
      ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS preferred_month TEXT;
      ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS hope_trip_feels_like TEXT;
      ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS dietary_and_accessibility TEXT;
      
      DROP POLICY IF EXISTS "leads_insert_customer_policy" ON public.leads;
      CREATE POLICY "leads_insert_customer_policy" ON public.leads
        FOR INSERT WITH CHECK (email = auth.jwt()->>'email');
    `,
  },
  {
    name: "add_profile_extended_columns",
    sql: `
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender TEXT;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nationality TEXT;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS passport_number TEXT;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth TEXT;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS expiry_date TEXT;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact_relation TEXT;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nomichi_points INTEGER DEFAULT 1200;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS completed_journeys INTEGER DEFAULT 2;
      
      DROP POLICY IF EXISTS "Allow users to update their own profiles" ON public.profiles;
      CREATE POLICY "Allow users to update their own profiles" ON public.profiles
        FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

      -- Seed the default user profile with details matching the mockup
      UPDATE public.profiles SET
        gender = 'Female',
        nationality = 'Indian',
        phone = '+91 98765 43210',
        passport_number = 'T1234567',
        date_of_birth = '1996-05-12',
        expiry_date = '2032-08-16',
        emergency_contact_name = 'Rohit Jhode',
        emergency_contact_phone = '+91 91234 56789',
        emergency_contact_relation = 'Brother',
        nomichi_points = 1200,
        completed_journeys = 2,
        full_name = 'Tejaswa Jhode'
      WHERE email = 'tejjhode@gmail.com';
    `,
  },
  {
    name: "add_profile_travel_preferences_columns",
    sql: `
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS travel_preferences JSONB;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS security_settings JSONB;

      -- Update the default user profile with seeded preferences matching standard options
      UPDATE public.profiles SET
        travel_preferences = '{
          "travel_style": ["Adventure", "Nature"],
          "preferred_destinations": ["India", "Europe"],
          "preferred_months": ["May", "June", "December"],
          "budget_range": "₹1L – ₹2L",
          "group_preference": "Couple",
          "accommodation_preference": "Boutique Stay",
          "dietary_preference": "Vegetarian",
          "activity_interests": ["Trekking", "Photography", "Food Tours"]
        }'::jsonb,
        notification_preferences = '{
          "email": {
            "enquiry_updates": true,
            "trip_confirmations": true,
            "payment_receipts": true,
            "itinerary_updates": true,
            "marketing_offers": false
          },
          "whatsapp": {
            "trip_updates": true,
            "team_messages": true,
            "booking_confirmations": true
          },
          "push": {
            "new_messages": true,
            "upcoming_journey_reminders": true,
            "important_travel_alerts": true
          }
        }'::jsonb,
        security_settings = '{
          "privacy": {
            "profile_visible_only_me": true,
            "receive_travel_recommendations": true,
            "share_profile_community": false
          },
          "two_factor_enabled": false
        }'::jsonb
      WHERE email = 'tejjhode@gmail.com';
    `,
  },
  {
    name: "create_user_settings_table",
    sql: `
      CREATE TABLE IF NOT EXISTS public.user_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        general JSONB DEFAULT '{"language":"English","timezone":"Asia/Kolkata","currency":"INR (₹)"}'::jsonb,
        appearance JSONB DEFAULT '{"theme":"light","font_size":"default","reduce_animations":false}'::jsonb,
        privacy JSONB DEFAULT '{"analytics_consent":true,"marketing_emails":false,"personalized_recommendations":true,"cookie_preference":"functional"}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
      ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "user_settings_select_own" ON public.user_settings;
      CREATE POLICY "user_settings_select_own" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);

      DROP POLICY IF EXISTS "user_settings_insert_own" ON public.user_settings;
      CREATE POLICY "user_settings_insert_own" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

      DROP POLICY IF EXISTS "user_settings_update_own" ON public.user_settings;
      CREATE POLICY "user_settings_update_own" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

      DROP POLICY IF EXISTS "user_settings_delete_own" ON public.user_settings;
      CREATE POLICY "user_settings_delete_own" ON public.user_settings FOR DELETE USING (auth.uid() = user_id);
    `,
  },
  {
    name: "add_trip_brochure_url",
    sql: `ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS brochure_url TEXT;`,
  },
  {
    name: "add_trip_created_by",
    sql: `ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;`,
  },
  {
    name: "add_trip_end_date",
    sql: `ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE;`,
  },
  {
    name: "add_trips_write_rls_policies",
    sql: `
      DROP POLICY IF EXISTS "Allow admin/manager/staff trips insert" ON public.trips;
      CREATE POLICY "Allow admin/manager/staff trips insert" ON public.trips
        FOR INSERT WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND LOWER(role) IN ('admin', 'manager', 'staff')
          )
        );

      DROP POLICY IF EXISTS "Allow admin/manager trips update" ON public.trips;
      CREATE POLICY "Allow admin/manager trips update" ON public.trips
        FOR UPDATE USING (
          EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND LOWER(role) IN ('admin', 'manager')
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND LOWER(role) IN ('admin', 'manager')
          )
        );

      DROP POLICY IF EXISTS "Allow admin/manager trips delete" ON public.trips;
      CREATE POLICY "Allow admin/manager trips delete" ON public.trips
        FOR DELETE USING (
          EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND LOWER(role) IN ('admin', 'manager')
          )
        );
    `,
  },
];
