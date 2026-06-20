-- 1. Create bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  departure_id UUID REFERENCES public.trip_departures(id) ON DELETE SET NULL,
  price DECIMAL(10, 2) NOT NULL,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('upi', 'card', 'bank_transfer', 'cash', 'other')),
  transaction_reference TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create travelers table
CREATE TABLE IF NOT EXISTS public.travelers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  gender TEXT,
  date_of_birth DATE,
  nationality TEXT,
  passport_number TEXT,
  passport_expiry DATE,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relation TEXT,
  visa_status TEXT DEFAULT 'not_required' CHECK (visa_status IN ('not_required', 'pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable Row Level Security
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travelers ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies if any
DROP POLICY IF EXISTS bookings_select_policy ON public.bookings;
DROP POLICY IF EXISTS bookings_insert_policy ON public.bookings;
DROP POLICY IF EXISTS bookings_update_policy ON public.bookings;
DROP POLICY IF EXISTS bookings_delete_policy ON public.bookings;

DROP POLICY IF EXISTS payments_select_policy ON public.payments;
DROP POLICY IF EXISTS payments_insert_policy ON public.payments;

DROP POLICY IF EXISTS travelers_select_policy ON public.travelers;
DROP POLICY IF EXISTS travelers_insert_policy ON public.travelers;
DROP POLICY IF EXISTS travelers_update_policy ON public.travelers;

-- 6. Create RLS Policies
CREATE POLICY bookings_select_policy ON public.bookings
  FOR SELECT USING (
    LOWER(public.get_my_role()) IN ('admin', 'manager', 'staff')
    OR user_id = auth.uid()
  );

CREATE POLICY bookings_insert_policy ON public.bookings
  FOR INSERT WITH CHECK (
    LOWER(public.get_my_role()) IN ('admin', 'manager', 'staff')
  );

CREATE POLICY bookings_update_policy ON public.bookings
  FOR UPDATE USING (
    LOWER(public.get_my_role()) IN ('admin', 'manager', 'staff')
  ) WITH CHECK (
    LOWER(public.get_my_role()) IN ('admin', 'manager', 'staff')
  );

CREATE POLICY bookings_delete_policy ON public.bookings
  FOR DELETE USING (
    LOWER(public.get_my_role()) = 'admin'
  );

-- Payments
CREATE POLICY payments_select_policy ON public.payments
  FOR SELECT USING (
    LOWER(public.get_my_role()) IN ('admin', 'manager', 'staff')
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND b.user_id = auth.uid()
    )
  );

CREATE POLICY payments_insert_policy ON public.payments
  FOR INSERT WITH CHECK (
    LOWER(public.get_my_role()) IN ('admin', 'manager', 'staff')
  );

-- Travelers
CREATE POLICY travelers_select_policy ON public.travelers
  FOR SELECT USING (
    LOWER(public.get_my_role()) IN ('admin', 'manager', 'staff')
    OR user_id = auth.uid()
  );

CREATE POLICY travelers_insert_policy ON public.travelers
  FOR INSERT WITH CHECK (
    LOWER(public.get_my_role()) IN ('admin', 'manager', 'staff')
    OR auth.uid() IS NOT NULL
  );

CREATE POLICY travelers_update_policy ON public.travelers
  FOR UPDATE USING (
    LOWER(public.get_my_role()) IN ('admin', 'manager', 'staff')
    OR user_id = auth.uid()
  ) WITH CHECK (
    LOWER(public.get_my_role()) IN ('admin', 'manager', 'staff')
    OR user_id = auth.uid()
  );
