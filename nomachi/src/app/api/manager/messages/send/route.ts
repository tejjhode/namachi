import { NextResponse } from "next/server";
import { createSupabaseServerClient, supabase } from "@/lib/supabase/server";
import { isManagerOrAdminRole, normalizeRole } from "@/lib/auth/roles";
import { encryptMessageServer } from "@/lib/utils/chat-encryption.server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const client = await createSupabaseServerClient();
    const { data: { user } } = await client.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await client
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    const role = normalizeRole(profile?.role || user.user_metadata?.role);
    if (!isManagerOrAdminRole(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const leadId = String(body.leadId || "").trim();
    const content = String(body.content || "").trim();

    if (!leadId || !content) {
      return NextResponse.json({ error: "leadId and content are required" }, { status: 400 });
    }

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, assigned_to")
      .eq("id", leadId)
      .maybeSingle();

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    if (role === "manager" && lead.assigned_to !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { ciphertext, iv } = encryptMessageServer(content);

    const { error: insertError } = await supabase.from("chat_messages").insert({
      lead_id: leadId,
      sender_id: user.id,
      sender_type: "team",
      content_encrypted: ciphertext,
      iv,
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
