import { redirect } from "next/navigation";
import { createSupabaseServerClient, supabase } from "@/lib/supabase/server";
import { isManagerOrAdminRole, normalizeRole } from "@/lib/auth/roles";
import { ManagerTripsClient } from "./ManagerTripsClient";


type TripRecord = {
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
};

type ManagerLeadRecord = {
  id: string;
  trip_id?: string | null;
  group_size?: number | null;
};

export default async function ManagerTripsPage() {
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
    redirect("/");
  }

  if (role === "ADMIN") {
    redirect("/admin/trips");
  }

  const [tripsResult, leadsResult , bookingsResult] = await Promise.all([
    supabase
      .from("trips")
      .select("id, title, destination, status, start_date, end_date, price, duration, image_url, total_seats, seats_left, created_at, created_by")
      .order("created_at", { ascending: false }),
    supabase
      .from("leads")
      .select("id, trip_id, group_size")
      .eq("assigned_to", user.id),
    supabase
  .from("bookings")
  .select("id, trip_id"),
  ]);

  const trips = (tripsResult.data || []) as TripRecord[];
  const leads = (leadsResult.data || []) as ManagerLeadRecord[];
const bookings = bookingsResult.data || [];
// console.log("BOOKINGS", bookings.slice(0, 5));

  const assignedTripIds = new Set(
    leads
      .map((lead) => lead.trip_id)
      .filter((tripId): tripId is string => Boolean(tripId))
  );

  const managerTripIds = new Set(
    trips
      .filter((trip) => trip.created_by === user.id || assignedTripIds.has(trip.id))
      .map((trip) => trip.id)
  );
// console.log(
//   "TRIPS",
//   trips.map((t) => ({
//     id: t.id,
//     title: t.title,
//   }))
// );



const serializedTrips = trips.map((trip) => {
  const travellers = bookings.filter(
    (booking: any) => booking.trip_id === trip.id
  ).length;

  // console.log(
  //   trip.title,
  //   trip.id,
  //   travellers
  // );

  return {
    ...trip,
    travellers,
  };
});

  return (
    <ManagerTripsClient
      user={{
        full_name: profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Manager",
        avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || null,
        email: user.email || "",
      }}
      trips={serializedTrips}
      managerTrips={Array.from(managerTripIds)}
    />
  );
}
