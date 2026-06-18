-- 1. Create Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  related_to TEXT,                -- E.g. "Rahul Sharma"
  related_id TEXT,                -- E.g. "LEAD-1024"
  source_kind TEXT NOT NULL,      -- 'lead', 'trip', 'departure'
  source_id UUID,                 -- UUID of related lead, trip, or departure
  type TEXT NOT NULL,             -- 'follow-up', 'vibe check', 'operations', 'document', 'payment', 'communication', 'booking'
  priority TEXT NOT NULL,         -- 'Low', 'Medium', 'High'
  due_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'to do',    -- 'to do', 'in progress', 'waiting', 'completed', 'overdue', 'cancelled'
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  details TEXT,
  subtasks JSONB DEFAULT '[]'::jsonb,  -- Array of subtask objects: [{"title": "Call traveler", "completed": false}]
  step INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks FORCE ROW LEVEL SECURITY;

-- 3. RLS Policies
DROP POLICY IF EXISTS "tasks_select_policy" ON public.tasks;
CREATE POLICY "tasks_select_policy" ON public.tasks FOR SELECT
  USING (
    LOWER(public.get_my_role()) IN ('admin', 'manager', 'staff')
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
  );

DROP POLICY IF EXISTS "tasks_insert_policy" ON public.tasks;
CREATE POLICY "tasks_insert_policy" ON public.tasks FOR INSERT
  WITH CHECK (
    LOWER(public.get_my_role()) IN ('admin', 'manager', 'staff')
    OR auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "tasks_update_policy" ON public.tasks;
CREATE POLICY "tasks_update_policy" ON public.tasks FOR UPDATE
  USING (
    LOWER(public.get_my_role()) IN ('admin', 'manager', 'staff')
    OR assigned_to = auth.uid()
  )
  WITH CHECK (
    LOWER(public.get_my_role()) IN ('admin', 'manager', 'staff')
    OR assigned_to = auth.uid()
  );

DROP POLICY IF EXISTS "tasks_delete_policy" ON public.tasks;
CREATE POLICY "tasks_delete_policy" ON public.tasks FOR DELETE
  USING (
    LOWER(public.get_my_role()) = 'admin'
    OR created_by = auth.uid()
  );

-- 4. Seed Data for Workflow Entities (Trips, Departures, Leads)
-- Tokyo Lights & Mt Fuji Trip
INSERT INTO public.trips (id, title, destination, status, price, total_seats, seats_left, image_url)
VALUES (
  '00000000-0000-0000-0000-000000000128',
  'Tokyo Lights & Mt Fuji',
  'Tokyo, Japan',
  'active',
  150000.00,
  15,
  7,
  'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=600&q=80'
)
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, destination = EXCLUDED.destination, status = EXCLUDED.status;

-- Swiss Alps Escape Trip
INSERT INTO public.trips (id, title, destination, status, price, total_seats, seats_left, image_url)
VALUES (
  '00000000-0000-0000-0000-000000000127',
  'Swiss Alps Escape',
  'Zermatt, Switzerland',
  'active',
  240000.00,
  12,
  8,
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80'
)
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, destination = EXCLUDED.destination, status = EXCLUDED.status;

-- Departure DEP-2026-001
INSERT INTO public.trip_departures (id, trip_id, start_date, end_date, total_seats, seats_left, price, status, created_by)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000128',
  '2026-06-25 10:00:00+05:30',
  '2026-07-02 18:00:00+05:30',
  15,
  7,
  150000.00,
  'active',
  'Ananya Mehta'
)
ON CONFLICT (id) DO UPDATE SET start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date, status = EXCLUDED.status;

-- Seed Leads
-- Rahul Sharma (Lead LEAD-1024)
INSERT INTO public.leads (id, name, email, phone, status, source, trip_id, group_size, assigned_to, enquiry_id)
VALUES (
  '00000000-0000-0000-0000-000000001024',
  'Rahul Sharma',
  'rahul.sharma@example.com',
  '+91 99887 76655',
  'new',
  'Website',
  '00000000-0000-0000-0000-000000000128',
  1,
  COALESCE((SELECT id FROM public.profiles WHERE role = 'MANAGER' LIMIT 1), (SELECT id FROM public.profiles LIMIT 1)),
  'LEAD-1024'
)
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, name = EXCLUDED.name, assigned_to = EXCLUDED.assigned_to;

-- Priya Iyer (Lead LEAD-1031)
INSERT INTO public.leads (id, name, email, phone, status, source, trip_id, group_size, assigned_to, enquiry_id)
VALUES (
  '00000000-0000-0000-0000-000000001031',
  'Priya Iyer',
  'priya.iyer@example.com',
  '+91 98765 43210',
  'qualified',
  'Instagram',
  '00000000-0000-0000-0000-000000000128',
  2,
  COALESCE((SELECT id FROM public.profiles WHERE role = 'MANAGER' LIMIT 1), (SELECT id FROM public.profiles LIMIT 1)),
  'LEAD-1031'
)
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, name = EXCLUDED.name, assigned_to = EXCLUDED.assigned_to;

-- Aman Verma (Traveler TRAV-2045)
INSERT INTO public.leads (id, name, email, phone, status, source, trip_id, group_size, assigned_to, enquiry_id)
VALUES (
  '00000000-0000-0000-0000-000000002045',
  'Aman Verma',
  'aman.verma@example.com',
  '+91 98888 77777',
  'converted',
  'Referral',
  '00000000-0000-0000-0000-000000000128',
  1,
  COALESCE((SELECT id FROM public.profiles WHERE role = 'MANAGER' LIMIT 1), (SELECT id FROM public.profiles LIMIT 1)),
  'TRAV-2045'
)
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, name = EXCLUDED.name, assigned_to = EXCLUDED.assigned_to;

-- Neha Joshi (Traveler TRAV-2081)
INSERT INTO public.leads (id, name, email, phone, status, source, trip_id, group_size, assigned_to, enquiry_id)
VALUES (
  '00000000-0000-0000-0000-000000002081',
  'Neha Joshi',
  'neha.joshi@example.com',
  '+91 97777 66666',
  'converted',
  'Website',
  '00000000-0000-0000-0000-000000000127',
  2,
  COALESCE((SELECT id FROM public.profiles WHERE role = 'MANAGER' LIMIT 1), (SELECT id FROM public.profiles LIMIT 1)),
  'TRAV-2081'
)
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, name = EXCLUDED.name, assigned_to = EXCLUDED.assigned_to;

-- Karan Mehta (Lead LEAD-1018)
INSERT INTO public.leads (id, name, email, phone, status, source, trip_id, group_size, assigned_to, enquiry_id)
VALUES (
  '00000000-0000-0000-0000-000000001018',
  'Karan Mehta',
  'karan.mehta@example.com',
  '+91 96666 55555',
  'new',
  'Search',
  '00000000-0000-0000-0000-000000000128',
  1,
  COALESCE((SELECT id FROM public.profiles WHERE role = 'MANAGER' LIMIT 1), (SELECT id FROM public.profiles LIMIT 1)),
  'LEAD-1018'
)
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, name = EXCLUDED.name, assigned_to = EXCLUDED.assigned_to;

-- 5. Seed Tasks
-- Task 1: Call Rahul Sharma
INSERT INTO public.tasks (id, title, description, related_to, related_id, source_kind, source_id, type, priority, due_date, status, assigned_to, created_by, details, subtasks, step)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Call Rahul Sharma',
  'Discuss itinerary and next steps',
  'Rahul Sharma',
  'LEAD-1024',
  'lead',
  '00000000-0000-0000-0000-000000001024',
  'follow-up',
  'High',
  '2026-06-18 16:00:00+05:30',
  'to do',
  COALESCE((SELECT id FROM public.profiles WHERE role = 'MANAGER' LIMIT 1), (SELECT id FROM public.profiles LIMIT 1)),
  COALESCE((SELECT id FROM public.profiles WHERE role = 'MANAGER' LIMIT 1), (SELECT id FROM public.profiles LIMIT 1)),
  'Call the traveler and discuss the itinerary, inclusions, exclusions and next steps. Answer any queries.',
  '[{"title": "Call traveler", "completed": false}, {"title": "Discuss itinerary", "completed": false}, {"title": "Share next steps", "completed": false}, {"title": "Update lead notes", "completed": false}]'::jsonb,
  5
)
ON CONFLICT (id) DO NOTHING;

-- Task 2: Schedule Vibe Check
INSERT INTO public.tasks (id, title, description, related_to, related_id, source_kind, source_id, type, priority, due_date, status, assigned_to, created_by, details, subtasks, step)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Schedule Vibe Check',
  'Schedule vibe check with traveler',
  'Priya Iyer',
  'LEAD-1031',
  'lead',
  '00000000-0000-0000-0000-000000001031',
  'vibe check',
  'Medium',
  '2026-06-19 11:00:00+05:30',
  'in progress',
  COALESCE((SELECT id FROM public.profiles WHERE role = 'MANAGER' LIMIT 1), (SELECT id FROM public.profiles LIMIT 1)),
  COALESCE((SELECT id FROM public.profiles WHERE role = 'MANAGER' LIMIT 1), (SELECT id FROM public.profiles LIMIT 1)),
  'Schedule and complete the vibe check call with the traveler. Ensure they align with group dynamics.',
  '[{"title": "Review traveler details", "completed": true}, {"title": "Propose time slots", "completed": false}, {"title": "Conduct vibe check call", "completed": false}]'::jsonb,
  8
)
ON CONFLICT (id) DO NOTHING;

-- Task 3: Upload Final Itinerary
INSERT INTO public.tasks (id, title, description, related_to, related_id, source_kind, source_id, type, priority, due_date, status, assigned_to, created_by, details, subtasks, step)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  'Upload Final Itinerary',
  'Upload final itinerary in system',
  'Tokyo Lights & Mt Fuji',
  'TRP-00128',
  'trip',
  '00000000-0000-0000-0000-000000000128',
  'operations',
  'Low',
  '2026-06-20 10:00:00+05:30',
  'waiting',
  COALESCE((SELECT id FROM public.profiles WHERE role = 'MANAGER' LIMIT 1), (SELECT id FROM public.profiles LIMIT 1)),
  COALESCE((SELECT id FROM public.profiles WHERE role = 'MANAGER' LIMIT 1), (SELECT id FROM public.profiles LIMIT 1)),
  'Compile and upload the final detailed day-by-day itinerary into the agency dashboard for travelers to view.',
  '[{"title": "Draft final schedule", "completed": false}, {"title": "Verify hotel locations", "completed": false}, {"title": "Upload PDF document", "completed": false}]'::jsonb,
  2
)
ON CONFLICT (id) DO NOTHING;

-- Task 4: Collect Passport Copy
INSERT INTO public.tasks (id, title, description, related_to, related_id, source_kind, source_id, type, priority, due_date, status, assigned_to, created_by, details, subtasks, step)
VALUES (
  '00000000-0000-0000-0000-000000000004',
  'Collect Passport Copy',
  'Request passport copy from traveler',
  'Aman Verma',
  'TRAV-2045',
  'lead',
  '00000000-0000-0000-0000-000000002045',
  'document',
  'High',
  '2026-06-17 18:00:00+05:30',
  'to do',
  COALESCE((SELECT id FROM public.profiles WHERE role = 'MANAGER' LIMIT 1), (SELECT id FROM public.profiles LIMIT 1)),
  COALESCE((SELECT id FROM public.profiles WHERE role = 'MANAGER' LIMIT 1), (SELECT id FROM public.profiles LIMIT 1)),
  'Reach out to Aman Verma to collect a high-quality scanned copy of their passport bio page for flight bookings.',
  '[{"title": "Send request email", "completed": false}, {"title": "Collect copy", "completed": false}, {"title": "Verify expiry date (>6 months)", "completed": false}]'::jsonb,
  11
)
ON CONFLICT (id) DO NOTHING;

-- Task 5: Confirm Hotel Bookings
INSERT INTO public.tasks (id, title, description, related_to, related_id, source_kind, source_id, type, priority, due_date, status, assigned_to, created_by, details, subtasks, step)
VALUES (
  '00000000-0000-0000-0000-000000000005',
  'Confirm Hotel Bookings',
  'Confirm all hotels for departure',
  'Departure #DEP-2026-001',
  'DEP-2026-001',
  'departure',
  '00000000-0000-0000-0000-000000000001',
  'operations',
  'High',
  '2026-06-20 12:00:00+05:30',
  'to do',
  COALESCE((SELECT id FROM public.profiles WHERE role = 'MANAGER' LIMIT 1), (SELECT id FROM public.profiles LIMIT 1)),
  COALESCE((SELECT id FROM public.profiles WHERE role = 'MANAGER' LIMIT 1), (SELECT id FROM public.profiles LIMIT 1)),
  'Perform final verification with local suppliers to confirm reservations for all hotels in this departure.',
  '[{"title": "Contact Tokyo Hotel", "completed": false}, {"title": "Contact Kyoto Ryokan", "completed": false}, {"title": "Save reservation codes", "completed": false}]'::jsonb,
  12
)
ON CONFLICT (id) DO NOTHING;

-- Task 6: Send Flight Details
INSERT INTO public.tasks (id, title, description, related_to, related_id, source_kind, source_id, type, priority, due_date, status, assigned_to, created_by, details, subtasks, step)
VALUES (
  '00000000-0000-0000-0000-000000000006',
  'Send Flight Details',
  'Send flight details to all travelers',
  'Swiss Alps Escape',
  'TRP-00127',
  'trip',
  '00000000-0000-0000-0000-000000000127',
  'communication',
  'Medium',
  '2026-06-21 09:00:00+05:30',
  'in progress',
  COALESCE((SELECT id FROM public.profiles WHERE role = 'MANAGER' LIMIT 1), (SELECT id FROM public.profiles LIMIT 1)),
  COALESCE((SELECT id FROM public.profiles WHERE role = 'MANAGER' LIMIT 1), (SELECT id FROM public.profiles LIMIT 1)),
  'Send out group flight details and booking instructions to all confirmed travelers for the Swiss Alps trip.',
  '[{"title": "Review flight schedule", "completed": true}, {"title": "Draft announcement email", "completed": false}, {"title": "Send email via CRM", "completed": false}]'::jsonb,
  2
)
ON CONFLICT (id) DO NOTHING;

-- Task 7: Review Visa Documents
INSERT INTO public.tasks (id, title, description, related_to, related_id, source_kind, source_id, type, priority, due_date, status, assigned_to, created_by, details, subtasks, step)
VALUES (
  '00000000-0000-0000-0000-000000000007',
  'Review Visa Documents',
  'Review and approve visa documents',
  'Neha Joshi',
  'TRAV-2081',
  'lead',
  '00000000-0000-0000-0000-000000002081',
  'document',
  'Medium',
  '2026-06-22 14:00:00+05:30',
  'waiting',
  COALESCE((SELECT id FROM public.profiles WHERE role = 'MANAGER' LIMIT 1), (SELECT id FROM public.profiles LIMIT 1)),
  COALESCE((SELECT id FROM public.profiles WHERE role = 'MANAGER' LIMIT 1), (SELECT id FROM public.profiles LIMIT 1)),
  'Check Neha Joshi''s uploaded visa application documents for accuracy and completeness before final submission.',
  '[{"title": "Check photo dimensions", "completed": false}, {"title": "Review bank statements", "completed": false}, {"title": "Approve in portal", "completed": false}]'::jsonb,
  11
)
ON CONFLICT (id) DO NOTHING;

-- Task 8: Send Payment Reminder
INSERT INTO public.tasks (id, title, description, related_to, related_id, source_kind, source_id, type, priority, due_date, status, assigned_to, created_by, details, subtasks, step)
VALUES (
  '00000000-0000-0000-0000-000000000008',
  'Send Payment Reminder',
  'Payment reminder for pending amount',
  'Karan Mehta',
  'LEAD-1018',
  'lead',
  '00000000-0000-0000-0000-000000001018',
  'follow-up',
  'High',
  '2026-06-16 10:00:00+05:30',
  'overdue',
  COALESCE((SELECT id FROM public.profiles WHERE role = 'MANAGER' LIMIT 1), (SELECT id FROM public.profiles LIMIT 1)),
  COALESCE((SELECT id FROM public.profiles WHERE role = 'MANAGER' LIMIT 1), (SELECT id FROM public.profiles LIMIT 1)),
  'Karan Mehta has a pending installment of ₹50,000 due. Send a polite reminder and follow up on payment status.',
  '[{"title": "Check payment gateway log", "completed": true}, {"title": "Send whatsapp reminder", "completed": false}, {"title": "Record update in notes", "completed": false}]'::jsonb,
  5
)
ON CONFLICT (id) DO NOTHING;
