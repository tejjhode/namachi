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

  if (!profile || profile.role?.toLowerCase() !== "admin") {
    redirect("/");
  }

  const userData = {
    fullName: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
    avatarUrl: user.user_metadata?.avatar_url,
    email: user.email || "",
    role: profile.role,
  };

  return <AdminPageClient user={userData} />;
}
