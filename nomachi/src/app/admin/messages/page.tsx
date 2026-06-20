import { redirect } from "next/navigation";
import { createSupabaseServerClient, supabase } from "@/lib/supabase/server";
import { normalizeRole } from "@/lib/auth/roles";
import { ManagerMessagesClient } from "@/app/manager/messages/ManagerMessagesClient";

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams?: { lead?: string };
}) {
  const client = await createSupabaseServerClient();
  const { data: { user } } = await client.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await client
    .from("profiles")
    .select("id, full_name, avatar_url, role, email")
    .eq("id", user.id)
    .single();

  const role = normalizeRole(profile?.role || user.user_metadata?.role);
  if (role !== "ADMIN") {
    redirect("/login");
  }

  // Fetch all leads (no assigned_to restriction for admins)
  const { data: leads } = await supabase
    .from("leads")
    .select(`
      id,
      name,
      email,
      phone,
      source,
      status,
      created_at,
      updated_at,
      group_size,
      notes,
      assigned_to,
      trip_id,
      trips (
        id,
        title,
        destination,
        image_url,
        start_date,
        end_date
      )
    `)
    .order("created_at", { ascending: false });

  const leadIds = (leads || []).map((lead: any) => lead.id);
  const { data: messages } = leadIds.length
    ? await supabase
        .from("chat_messages")
        .select("id, lead_id, sender_type, content_encrypted, iv, created_at, sender_id")
        .in("lead_id", leadIds)
        .order("created_at", { ascending: true })
    : { data: [] as any[] };

  return (
    <ManagerMessagesClient
      user={{
        full_name: profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Admin",
        avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || null,
        email: profile?.email || user.email || "",
      }}
      leads={(leads || []) as any[]}
      messages={(messages || []) as any[]}
      selectedLeadId={searchParams?.lead || null}
    />
  );
}
