-- Create leads table
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'vibe check sent', 'negotiating', 'converted', 'lost')),
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

-- Ensure columns exist if table was created in a partial state previously
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS trip_interest UUID REFERENCES public.trips(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS vibe_check_score INTEGER CHECK (vibe_check_score >= 0 AND vibe_check_score <= 100);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_trip_interest ON public.leads(trip_interest);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
