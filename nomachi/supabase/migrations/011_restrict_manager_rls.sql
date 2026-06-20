-- Drop old policies if they exist
DROP POLICY IF EXISTS "leads_select_own_or_team_policy" ON public.leads;
DROP POLICY IF EXISTS "leads_update_policy" ON public.leads;
DROP POLICY IF EXISTS "lead_notes_select_policy" ON public.lead_notes;
DROP POLICY IF EXISTS bookings_select_policy ON public.bookings;
DROP POLICY IF EXISTS payments_select_policy ON public.payments;
DROP POLICY IF EXISTS travelers_select_policy ON public.travelers;

-- Create restricted policies
-- 1. Leads
CREATE POLICY "leads_select_restricted_policy" ON public.leads
  FOR SELECT USING (
    assigned_to = auth.uid() OR
    LOWER(public.get_my_role()) IN ('admin', 'staff')
  );

CREATE POLICY "leads_update_restricted_policy" ON public.leads
  FOR UPDATE USING (
    assigned_to = auth.uid() OR
    LOWER(public.get_my_role()) IN ('admin', 'staff')
  ) WITH CHECK (
    assigned_to = auth.uid() OR
    LOWER(public.get_my_role()) IN ('admin', 'staff')
  );

-- 2. Lead Notes
CREATE POLICY "lead_notes_select_restricted_policy" ON public.lead_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.leads
      WHERE id = lead_id AND (
        assigned_to = auth.uid() OR
        LOWER(public.get_my_role()) IN ('admin', 'staff')
      )
    )
  );

-- 3. Bookings
CREATE POLICY bookings_select_restricted_policy ON public.bookings
  FOR SELECT USING (
    LOWER(public.get_my_role()) IN ('admin', 'staff')
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_id AND l.assigned_to = auth.uid()
    )
  );

-- 4. Payments
CREATE POLICY payments_select_restricted_policy ON public.payments
  FOR SELECT USING (
    LOWER(public.get_my_role()) IN ('admin', 'staff')
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND (
        b.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.leads l
          WHERE l.id = b.lead_id AND l.assigned_to = auth.uid()
        )
      )
    )
  );

-- 5. Travelers
CREATE POLICY travelers_select_restricted_policy ON public.travelers
  FOR SELECT USING (
    LOWER(public.get_my_role()) IN ('admin', 'staff')
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.leads l ON l.id = b.lead_id
      WHERE b.id = booking_id AND l.assigned_to = auth.uid()
    )
  );
