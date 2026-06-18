import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminLayoutClient } from "./AdminLayoutClient";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabaseServer = await createSupabaseServerClient();
  const { data: { user } } = await supabaseServer.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabaseServer
    .from("profiles")
    .select("role, full_name, avatar_url")
    .eq("id", user.id)
    .single();

  const normalizeRole = (value?: string | null) => value?.trim().toLowerCase() || "";
  const roleFromProfile = normalizeRole(profile?.role);
  const roleFromMetadata = normalizeRole(user.user_metadata?.role);
  const allowedRole = [roleFromProfile, roleFromMetadata].find((role) => ["admin", "manager"].includes(role));

  if (!profile && !allowedRole) {
    redirect("/login");
  }

  const userData = {
    fullName: profile?.full_name || user.email?.split("@")[0] || "User",
    avatarUrl: profile?.avatar_url || user.user_metadata?.avatar_url,
    email: user.email || "",
    role: allowedRole || profile?.role || user.user_metadata?.role || "User",
  };

  return (
    <AdminLayoutClient user={userData}>
      {children}
    </AdminLayoutClient>
  );
}
