import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { TripEnquiryView } from "@/components/TripEnquiryView";


interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TripEnquiryPage({ params }: PageProps) {
  const resolvedParams = await params;
  const tripId = resolvedParams.id;
  
  const supabaseServer = await createSupabaseServerClient();
  
  // Get authenticated user securely
  const { data: { user } } = await supabaseServer.auth.getUser();
  
  if (!user) {
    redirect("/login");
  }

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
  const { data: leads } = await supabaseServer
    .from("leads")
    .select("*, trips(*), lead_notes(*)")
    .eq("email", user.email);
  if (leads) {
    userLeads = leads;
  }

  // Fetch user's profile details from profiles table
  const { data: profile } = await supabaseServer
    .from("profiles")
    .select("full_name, avatar_url, phone")
    .eq("id", user.id)
    .maybeSingle();

  const userData = {
    id: user.id,
    fullName: profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
    avatarUrl: profile?.avatar_url || user.user_metadata?.avatar_url,
    email: user.email || "",
    phone: profile?.phone || ""
  };

  return (
    <TripEnquiryView 
      user={userData} 
      leads={userLeads} 
      trip={trip} 
    />
  );
}
