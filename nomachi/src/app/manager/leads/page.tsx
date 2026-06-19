import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isManagerOrAdminRole, normalizeRole } from "@/lib/auth/roles";
import { ManagerLeadsClient } from "./ManagerLeadsClient";


export default async function ManagerLeadsPage() {
  const client = await createSupabaseServerClient();
  const { data: { user } } = await client.auth.getUser();

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
    redirect("/admin/leads");
  }

  const { data: leads } = await client
    .from("leads")
    .select("id, name, email, phone, source, status, created_at, assigned_to, trips(id, title, destination, image_url)")
    .eq("assigned_to", user.id)
    .order("created_at", { ascending: false });

  const leadItems = (leads || []).map((lead: any) => ({
    id: lead.id,
    name: lead.name || "Unknown Lead",
    email: lead.email || "",
    phone: lead.phone || null,
    source: lead.source || null,
    status: lead.status || "new",
    created_at: lead.created_at || null,
    trip_title: lead.trips?.title || "General Enquiry",
    trip_destination: lead.trips?.destination || null,
    trip_image_url: lead.trips?.image_url || null,
  }));

  return (
    <ManagerLeadsClient
      user={{
        full_name: profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Manager",
        avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || null,
      }}
      leads={leadItems}
    />
  );
}
