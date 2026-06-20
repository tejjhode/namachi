import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeRole } from "@/lib/auth/roles";
import { redirect } from "next/navigation";
import { ManagerTasksClient } from "@/app/manager/tasks/ManagerTasksClient";

type EntityKind = "Lead" | "Trip" | "Traveler" | "Departure" | "Booking";

export default async function AdminTasksPage() {
  const client = await createSupabaseServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await client
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = normalizeRole(profile?.role || user.user_metadata?.role);
  if (role !== "ADMIN") {
    redirect("/login");
  }

  // Fetch all tasks from database
  // Join the profiles table twice to get assignee and creator details
  const [tasksResult, leadsResult, tripsResult, departuresResult, teamResult] = await Promise.all([
    client
      .from("tasks")
      .select(`
        *,
        assignee:profiles!assigned_to(full_name, avatar_url, role),
        creator:profiles!created_by(full_name, avatar_url)
      `)
      .order("created_at", { ascending: false }),
    client
      .from("leads")
      .select("id, name, status, trip_id, enquiry_id")
      .order("created_at", { ascending: false }),
    client
      .from("trips")
      .select("id, title, destination")
      .order("created_at", { ascending: false }),
    client
      .from("trip_departures")
      .select("id, trip_id, status, start_date")
      .order("created_at", { ascending: false }),
    client
      .from("profiles")
      .select("id, full_name, avatar_url, role")
      .order("full_name")
  ]);

  const dbTasks = tasksResult.data || [];
  const leads = leadsResult.data || [];
  const trips = tripsResult.data || [];
  const departures = departuresResult.data || [];
  const team = teamResult.data || [];

  // Map database tasks to TaskItem schema
  const tasks = dbTasks.map((t: any) => {
    // Determine entityKind
    let entityKind: EntityKind = "Lead";
    if (t.source_kind === "trip") entityKind = "Trip";
    else if (t.source_kind === "departure") entityKind = "Departure";
    else if (t.related_id?.startsWith("TRAV")) entityKind = "Traveler";

    return {
      id: t.id,
      title: t.title,
      description: t.description || "",
      relatedTo: t.related_to || "General",
      relatedId: t.related_id || "TASK",
      sourceKind: t.source_kind,
      sourceId: t.source_id || "",
      entityKind,
      type: t.type,
      priority: t.priority,
      dueDate: t.due_date || new Date().toISOString(),
      status: t.status,
      assignee: {
        name: t.assignee?.full_name || "Unassigned",
        role: t.assignee?.role || "Manager",
        avatar: t.assignee?.avatar_url || null
      },
      createdBy: {
        name: t.creator?.full_name || "Admin",
        avatar: t.creator?.avatar_url || null,
        date: t.created_at || new Date().toISOString()
      },
      details: t.details || "",
      subtasks: (t.subtasks || []).map((st: any) => st.title),
      subtaskCompletedStates: (t.subtasks || []).map((st: any) => st.completed),
      step: t.step || 5,
      tripTitle: t.related_to,
      tripCode: t.related_id
    };
  });

  return (
    <ManagerTasksClient
      tasks={tasks}
      leads={leads}
      trips={trips}
      departures={departures}
      team={team}
    />
  );
}
