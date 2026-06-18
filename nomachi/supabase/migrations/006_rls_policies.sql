-- RLS Policies for profiles
CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_update_own_policy" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_admin_policy" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- RLS Policies for trips
CREATE POLICY "trips_select_policy" ON public.trips
  FOR SELECT USING (true);

CREATE POLICY "trips_insert_policy" ON public.trips
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'staff')
    )
  );

CREATE POLICY "trips_update_policy" ON public.trips
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- RLS Policies for leads
CREATE POLICY "leads_select_own_or_team_policy" ON public.leads
  FOR SELECT USING (
    auth.uid() = assigned_to OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "leads_insert_policy" ON public.leads
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'staff')
    )
  );

CREATE POLICY "leads_update_policy" ON public.leads
  FOR UPDATE USING (
    auth.uid() = assigned_to OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    auth.uid() = assigned_to OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- RLS Policies for lead_notes
CREATE POLICY "lead_notes_select_policy" ON public.lead_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.leads
      WHERE id = lead_id AND (
        auth.uid() = assigned_to OR
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
      )
    )
  );

CREATE POLICY "lead_notes_insert_policy" ON public.lead_notes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'staff')
    )
  );

-- RLS Policies for activities
CREATE POLICY "activities_select_policy" ON public.activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "activities_insert_policy" ON public.activities
  FOR INSERT WITH CHECK (true);
