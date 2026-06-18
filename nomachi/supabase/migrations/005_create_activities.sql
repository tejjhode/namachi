-- Create activities table
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('lead', 'trip', 'profile')),
  entity_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'assigned', 'status_changed', 'noted')),
  performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  changes JSONB,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_activities_entity ON public.activities(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activities_performed_by ON public.activities(performed_by);
CREATE INDEX IF NOT EXISTS idx_activities_action ON public.activities(action);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON public.activities(created_at);

-- Enable RLS
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
