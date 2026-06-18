"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function submitEnquiry(tripId: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to send an enquiry." };
  }

  // 1. Check if an enquiry already exists for this user and trip
  const { data: existingEnquiry, error: fetchError } = await supabase
    .from("leads")
    .select("id")
    .eq("user_id", user.id)
    .eq("trip_id", tripId)
    .maybeSingle();

  if (existingEnquiry) {
    return { error: "You have already placed an enquiry for this trip." };
  }

  // Fetch trip title for the success message
  const { data: trip } = await supabase
    .from("trips")
    .select("title")
    .eq("id", tripId)
    .single();

  // 2. If no duplicate found, proceed with insert
  const { error: insertError } = await supabase
    .from("leads")
    .insert({ user_id: user.id, trip_id: tripId });

  if (insertError) return { error: insertError.message };

  revalidatePath("/dashboard/enquiries");
  return { 
    success: true, 
    message: `Your enquiry for ${trip?.title || "your trip"} has been received. Our travel expert will contact you within 24 hours.` 
  };
}