import { createSupabaseServerClient, supabase } from "@/lib/supabase/server";
import { isManagerOrAdminRole, normalizeRole } from "@/lib/auth/roles";
import { redirect } from "next/navigation";
import { ManagerActivityClient } from "./ManagerActivityClient";


type ActivityRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  performed_by?: string | null;
  changes?: any;
  description?: string | null;
  created_at?: string | null;
};

type ProfileRow = {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  role?: string | null;
};

type LeadRow = {
  id: string;
  name: string;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  assigned_to?: string | null;
  trips?: { id?: string | null; title?: string | null; destination?: string | null; image_url?: string | null } | null;
};

type TripRow = {
  id: string;
  title: string;
  destination?: string | null;
  status?: string | null;
  created_at?: string | null;
  created_by?: string | null;
  image_url?: string | null;
};

type DepartureRow = {
  id: string;
  trip_id?: string | null;
  status?: string | null;
  created_at?: string | null;
  start_date?: string | null;
  end_date?: string | null;
};

type ChatMessageRow = {
  id: string;
  lead_id?: string | null;
  sender_type?: string | null;
  sender_id?: string | null;
  created_at?: string | null;
};

type ActivityItem = {
  id: string;
  label: string;
  details: string;
  entity: string;
  entityType: string;
  category: "system" | "leads" | "trips" | "payments" | "messages" | "documents" | "team";
  userId?: string | null;
  userName: string;
  userAvatar?: string | null;
  time: string;
  sortTime: number;
  action: string;
  status: string;
};

const formatDate = (value?: string | null) => {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const buildLabel = (action: string, entityType: string) => {
  const normalized = action.toLowerCase();
  const type = entityType.toLowerCase();
  if (normalized === "assigned") return type === "trip" ? "Trip Assigned" : "Lead Assigned";
  if (normalized === "status_changed") return "Status Updated";
  if (normalized === "noted") return "Note Added";
  if (normalized === "deleted") return "Deleted";
  if (normalized === "updated") return "Updated";
  if (normalized === "created") return `${entityType} Created`;
  return action.replace(/_/g, " ");
};

const categoryFromEntity = (value: string): ActivityItem["category"] => {
  const normalized = value.toLowerCase();
  if (normalized === "lead") return "leads";
  if (normalized === "trip") return "trips";
  if (normalized === "profile") return "team";
  return "system";
};

const summarizeChange = (row: ActivityRow, entityName: string) => {
  const changes = row.changes && typeof row.changes === "object" ? row.changes : null;
  if (!changes) return row.description || `${entityName} ${row.action.replace(/_/g, " ")}`;
  if (row.action === "assigned" && changes.assigned_to_name) return `${entityName} assigned to ${changes.assigned_to_name}`;
  if (row.action === "status_changed" && changes.to) return `${entityName} moved to ${changes.to}`;
  if (row.action === "noted" && changes.content) return `Note added: ${String(changes.content).slice(0, 90)}`;
  return row.description || `${entityName} ${row.action.replace(/_/g, " ")}`;
};

export default async function ManagerActivityPage() {
  const client = await createSupabaseServerClient();
  const { data: { user } } = await client.auth.getUser();

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
    redirect("/admin");
  }

  const [activityResult, leadsResult, tripsResult, departuresResult, messagesResult, teamResult, notesResult] = await Promise.all([
    supabase.from("activities").select("*").order("created_at", { ascending: false }).limit(250),
    supabase
      .from("leads")
      .select("id, name, status, created_at, updated_at, assigned_to, trips(id, title, destination, image_url)")
      .eq("assigned_to", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("trips")
      .select("id, title, destination, status, created_at, created_by, image_url")
      .order("created_at", { ascending: false }),
    supabase
      .from("trip_departures")
      .select("id, trip_id, status, created_at, start_date, end_date")
      .order("created_at", { ascending: false }),
    supabase
      .from("chat_messages")
      .select("id, lead_id, sender_type, sender_id, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url, role, created_at")
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("lead_notes")
      .select("id, lead_id, content, created_at, created_by")
      .order("created_at", { ascending: false })
      .limit(200)
  ]);

  const activities = (activityResult.data || []) as ActivityRow[];
  const leads = (leadsResult.data || []) as LeadRow[];
  const trips = (tripsResult.data || []) as TripRow[];
  const departures = (departuresResult.data || []) as DepartureRow[];
  const messages = (messagesResult.data || []) as ChatMessageRow[];
  const team = (teamResult.data || []) as Array<ProfileRow & { created_at?: string | null }>;
  const leadNotes = (notesResult.data || []) as any[];

  const managerLeadIds = new Set(leads.map((l) => l.id));
  const managerTripIds = new Set(leads.map((l) => l.trips?.id).filter(Boolean) as string[]);
  
  // Include trips created by the manager
  trips.forEach((t) => {
    if (t.created_by === user.id) {
      managerTripIds.add(t.id);
    }
  });

  const profileMap = new Map(team.map((item) => [item.id, item]));
  const leadMap = new Map(leads.map((item) => [item.id, item]));
  const tripMap = new Map(trips.map((item) => [item.id, item]));

  // Filter raw activities to only show items performed by or relevant to the manager's leads/trips
  const managerActivities = activities.filter((row) => {
    if (row.performed_by === user.id) return true;
    if (row.entity_type === "lead" && managerLeadIds.has(row.entity_id)) return true;
    if (row.entity_type === "trip" && managerTripIds.has(row.entity_id)) return true;
    return false;
  });

  const actualItems: ActivityItem[] = managerActivities.map((row) => {
    const entityType = (row.entity_type || "system").toLowerCase();
    const entity = entityType === "lead"
      ? leadMap.get(row.entity_id)?.name || "Lead"
      : entityType === "trip"
        ? tripMap.get(row.entity_id)?.title || "Trip"
        : profileMap.get(row.entity_id)?.full_name || entityType || "System";
    const performer = row.performed_by ? profileMap.get(row.performed_by) : undefined;
    const label = buildLabel(row.action, row.entity_type || "System");
    return {
      id: row.id,
      label,
      details: summarizeChange(row, entity),
      entity,
      entityType: row.entity_type || "system",
      category: categoryFromEntity(entityType),
      userId: row.performed_by || null,
      userName: performer?.full_name || profile?.full_name || user.email?.split("@")[0] || "Manager",
      userAvatar: performer?.avatar_url || null,
      time: row.created_at || new Date().toISOString(),
      sortTime: new Date(row.created_at || Date.now()).getTime(),
      action: row.action,
      status: row.action,
      entityId: row.entity_id,
    };
  });

  // Filter fallback inputs to only show items belonging to the manager
  const fallbackLeads = leads;
  const fallbackTrips = trips.filter((t) => managerTripIds.has(t.id));
  const fallbackDepartures = departures.filter((d) => d.trip_id && managerTripIds.has(d.trip_id));
  const fallbackMessages = messages.filter((m) => m.lead_id && managerLeadIds.has(m.lead_id));

  const fallbackItems: ActivityItem[] = [
    ...fallbackLeads.map((lead) => ({
      id: `lead-${lead.id}`,
      label: "Lead Assigned",
      details: `${lead.name} assigned to ${profile?.full_name || user.email?.split("@")[0] || "Manager"}`,
      entity: lead.name,
      entityType: "Lead",
      category: "leads" as const,
      userId: user.id,
      userName: profile?.full_name || user.email?.split("@")[0] || "Manager",
      userAvatar: profile?.avatar_url || user.user_metadata?.avatar_url || null,
      time: lead.updated_at || lead.created_at || new Date().toISOString(),
      sortTime: new Date(lead.updated_at || lead.created_at || Date.now()).getTime(),
      action: "assigned",
      status: lead.status || "new",
      entityId: lead.id,
    })),
    ...fallbackTrips.map((trip) => ({
      id: `trip-${trip.id}`,
      label: trip.status === "active" ? "Trip Activated" : "Trip Created",
      details: `${trip.title} ${trip.destination ? `in ${trip.destination}` : ""}`.trim(),
      entity: trip.title,
      entityType: "Trip",
      category: "trips" as const,
      userId: trip.created_by || user.id,
      userName: profileMap.get(trip.created_by || "")?.full_name || profile?.full_name || user.email?.split("@")[0] || "Manager",
      userAvatar: profileMap.get(trip.created_by || "")?.avatar_url || profile?.avatar_url || null,
      time: trip.created_at || new Date().toISOString(),
      sortTime: new Date(trip.created_at || Date.now()).getTime(),
      action: "created",
      status: trip.status || "draft",
      entityId: trip.id,
    })),
    ...fallbackDepartures.map((departure) => {
      const trip = departure.trip_id ? tripMap.get(departure.trip_id) : undefined;
      return {
        id: `departure-${departure.id}`,
        label: "Departure Created",
        details: `${trip?.title || "Departure"}${departure.start_date ? ` starting ${formatDate(departure.start_date)}` : ""}`,
        entity: trip?.title || "Departure",
        entityType: "Booking",
        category: "trips" as const,
        userId: user.id,
        userName: profile?.full_name || user.email?.split("@")[0] || "Manager",
        userAvatar: profile?.avatar_url || user.user_metadata?.avatar_url || null,
        time: departure.created_at || new Date().toISOString(),
        sortTime: new Date(departure.created_at || Date.now()).getTime(),
        action: "created",
        status: departure.status || "active",
        entityId: departure.trip_id || null,
      };
    }),
    ...fallbackMessages.filter((message) => message.sender_type === "team").map((message) => {
      const lead = message.lead_id ? leadMap.get(message.lead_id) : undefined;
      return {
        id: `message-${message.id}`,
        label: "Message Sent",
        details: `Sent update to ${lead?.name || "a lead"}`,
        entity: lead?.name || "Lead",
        entityType: "Lead",
        category: "messages" as const,
        userId: message.sender_id || user.id,
        userName: profileMap.get(message.sender_id || "")?.full_name || profile?.full_name || user.email?.split("@")[0] || "Manager",
        userAvatar: profileMap.get(message.sender_id || "")?.avatar_url || profile?.avatar_url || null,
        time: message.created_at || new Date().toISOString(),
        sortTime: new Date(message.created_at || Date.now()).getTime(),
        action: "created",
        status: "sent",
        entityId: message.lead_id || null,
      };
    }),
    ...team
      .filter((member) => member.id !== user.id && member.created_at)
      .slice(0, 5)
      .map((member) => ({
        id: `team-${member.id}`,
        label: "Team Member Added",
        details: `${member.full_name || "A team member"} joined the workspace`,
        entity: member.full_name || "Team Member",
        entityType: "Profile",
        category: "team" as const,
        userId: member.id,
        userName: member.full_name || "Team Member",
        userAvatar: member.avatar_url || null,
        time: member.created_at || new Date().toISOString(),
        sortTime: new Date(member.created_at || Date.now()).getTime(),
        action: "created",
        status: member.role || "user",
        entityId: member.id,
      })),
  ];

  const activitiesToShow = actualItems.length > 0 ? actualItems : fallbackItems;
  const tripsToShow = fallbackTrips.length > 0 ? fallbackTrips : trips;

  return (
    <ManagerActivityClient
      user={{
        full_name: profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Manager",
        avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || null,
        email: profile?.email || user.email || "",
      }}
      activities={activitiesToShow.sort((left, right) => right.sortTime - left.sortTime)}
      leads={leads as any[]}
      trips={tripsToShow as any[]}
      departures={departures as any[]}
      team={team as any[]}
    />
  );
}
