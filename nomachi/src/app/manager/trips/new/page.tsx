import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isManagerOrAdminRole, normalizeRole } from "@/lib/auth/roles";
import { NewManagerTripClient } from "./NewManagerTripClient";


export default async function NewManagerTripPage() {
  const client = await createSupabaseServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await client
    .from("profiles")
    .select("id, full_name, avatar_url, email, role")
    .eq("id", user.id)
    .single();

  const role = normalizeRole(profile?.role || user.user_metadata?.role);
  if (!isManagerOrAdminRole(role)) {
    redirect("/");
  }

  if (role === "ADMIN") {
    redirect("/admin/trips/new");
  }

  return (
    <NewManagerTripClient
      user={{
        id: user.id,
        full_name: profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Manager",
        avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || null,
        email: profile?.email || user.email || "",
      }}
    />
  );
}
