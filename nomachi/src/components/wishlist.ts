"use server";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function toggleWishlist(tripId: string) {
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
    return { error: "Unauthorized" };
  }

  // Check if it's already in the wishlist
  const { data: existing } = await supabase
    .from("wishlists")
    .select()
    .eq("user_id", user.id)
    .eq("trip_id", tripId)
    .single();

  if (existing) {
    await supabase.from("wishlists").delete().eq("id", existing.id);
  } else {
    await supabase.from("wishlists").insert({ user_id: user.id, trip_id: tripId });
  }

  revalidatePath("/wishlist");
  return { success: true };
}

export async function getWishlist() {
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

  if (!user) return [];

  // Fetch wishlist items joined with trip details
  const { data, error } = await supabase
    .from("wishlists")
    .select(`
      *,
      trips:trip_id (*)
    `)
    .eq("user_id", user.id); // This ensures only the logged-in user's data is returned

  if (error) {
    console.error("Error fetching wishlist:", error);
    return [];
  }

  return data;
}