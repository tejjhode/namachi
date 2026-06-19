import { createSupabaseServerClient, supabase } from "@/lib/supabase/server";
import { isManagerOrAdminRole, normalizeRole } from "@/lib/auth/roles";
import { notFound, redirect } from "next/navigation";
import { ManagerTripDetailsClient } from "./ManagerTripDetailsClient";


interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

type TripRow = {
  id: string;
  title: string;
  destination?: string | null;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  price?: number | null;
  duration?: string | null;
  image_url?: string | null;
  total_seats?: number | null;
  seats_left?: number | null;
  created_at?: string | null;
  created_by?: string | null;
  trip_style?: string | null;
  best_for?: string | null;
  difficulty?: string | null;
  age_group?: string | null;
  meals?: string | null;
  group_size?: string | null;
  description?: string | null;
  accommodation?: string | null;
  brochure_url?: string | null;
  highlights?: string[] | null;
  inclusions?: string[] | null;
  exclusions?: string[] | null;
  itinerary?: Array<{ day?: number; title?: string; description?: string; image?: string } | string> | null;
  faqs?: Array<{ question?: string; answer?: string } | string> | null;
  images?: string[] | null;
};

export default async function ManagerTripDetailsPage({ params }: PageProps) {
  const { id } = await params;
  const client = await createSupabaseServerClient();

  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await client
    .from("profiles")
    .select("id, full_name, avatar_url, role")
    .eq("id", user.id)
    .single();

  const role = normalizeRole(profile?.role || user.user_metadata?.role);
  if (!isManagerOrAdminRole(role)) {
    redirect("/manager");
  }

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("*")
    .eq("id", id)
    .single();

  if (tripError || !trip) {
    notFound();
  }

  const tripRow = trip as TripRow;

  const [creatorResult, leadsResult, departuresResult] = await Promise.all([
    tripRow.created_by
      ? supabase.from("profiles").select("id, full_name, avatar_url, role").eq("id", tripRow.created_by).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("leads")
      .select("id, status, group_size, created_at, updated_at, assigned_to")
      .eq("trip_id", id),
    supabase
      .from("trip_departures")
      .select("id, status, created_at")
      .eq("trip_id", id),
  ]);

  const leads = (leadsResult.data || []) as Array<{ status?: string | null; group_size?: number | null }>;
  const departures = (departuresResult.data || []) as Array<{ status?: string | null }>;

  const travellers = leads.reduce((sum, lead) => sum + (lead.group_size || 1), 0);
  const enquiries = leads.length;
  const confirmed = leads.filter((lead) => ["converted", "confirmed"].includes((lead.status || "").toLowerCase())).length;
  const activeDepartures = departures.filter((departure) => (departure.status || "").toLowerCase() === "active").length;

  return (
    <ManagerTripDetailsClient
      user={{
        full_name: profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Manager",
        avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || null,
        email: user.email || "",
      }}
      trip={tripRow}
      creator={(creatorResult.data as { full_name?: string | null; avatar_url?: string | null; role?: string | null } | null) || null}
      stats={{
        travellers,
        enquiries,
        confirmed,
        activeDepartures,
      }}
    />
  );
}
