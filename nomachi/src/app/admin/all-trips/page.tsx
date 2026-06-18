import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminPageClient } from "./AdminPageClient";

export const dynamic = "force-dynamic";

export default async function AdminAllTripsPage() {
  const supabaseServer = await createSupabaseServerClient();
  const { data: { user } } = await supabaseServer.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabaseServer
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const normalizeRole = (value?: string | null) => value?.trim().toLowerCase() || "";
  const roleFromProfile = normalizeRole(profile?.role);
  const roleFromMetadata = normalizeRole(user.user_metadata?.role);
  const allowedRole = [roleFromProfile, roleFromMetadata].find((role) => role === "admin");

  if (!allowedRole) {
    redirect("/admin");
  }

  const userData = {
    fullName: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
    avatarUrl: user.user_metadata?.avatar_url,
    email: user.email || "",
    role: allowedRole || profile?.role || user.user_metadata?.role || "User",
  };

  return <AdminPageClient user={userData} />;
}
