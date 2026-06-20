import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { TripDetailsView } from "@/components/TripDetailsView";


interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TripDetailsPage({ params }: PageProps) {
  const resolvedParams = await params;
  const tripId = resolvedParams.id;
  
  const supabaseServer = await createSupabaseServerClient();
  
  // Get authenticated user securely
  const { data: { user } } = await supabaseServer.auth.getUser();
  
  // Fetch trip details from database
  const { data: trip, error } = await supabaseServer
    .from("trips")
    .select("*")
    .eq("id", tripId)
    .single();

  if (error || !trip) {
    console.error("Trip not found:", error);
    notFound();
  }

  // Fetch user's leads (enquiries & journeys) for sidebar count and message feed
  let userLeads: any[] = [];
  if (user) {
    const { data: leads } = await supabaseServer
      .from("leads")
      .select("*, trips(*), lead_notes(*)")
      .eq("email", user.email);
    if (leads) {
      userLeads = leads;
    }
  }

  const userData = {
    fullName: user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Guest",
    avatarUrl: user?.user_metadata?.avatar_url,
    email: user?.email || ""
  };

  return (
    <TripDetailsView 
      user={userData} 
      leads={userLeads} 
      trip={trip} 
    />
  );
}
