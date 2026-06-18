import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export type TaskSubtask = {
  title: string;
  completed: boolean;
};

export type DBTask = {
  id: string;
  title: string;
  description?: string | null;
  related_to?: string | null;
  related_id?: string | null;
  source_kind: string;
  source_id?: string | null;
  type: string;
  priority: string;
  due_date?: string | null;
  status: string;
  assigned_to?: string | null;
  created_by?: string | null;
  details?: string | null;
  subtasks: TaskSubtask[];
  step?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export const taskService = {
  async getTasks(): Promise<DBTask[]> {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as DBTask[];
  },

  async createTask(task: Omit<DBTask, "id" | "created_at" | "updated_at">): Promise<DBTask> {
    const { data, error } = await supabase
      .from("tasks")
      .insert([task])
      .select()
      .single();

    if (error) throw error;
    return data as DBTask;
  },

  async updateTaskStatus(id: string, status: string): Promise<DBTask> {
    const { data, error } = await supabase
      .from("tasks")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Automatically advance the workflow of the underlying lead/trip if task status changes
    try {
      const task = data as DBTask;
      if (task.source_kind === "lead" && task.source_id) {
        let nextLeadStatus = "";
        if (status === "completed") {
          const titleLower = task.title.toLowerCase();
          if (titleLower.includes("call") || titleLower.includes("contact")) {
            nextLeadStatus = "contacted";
          } else if (titleLower.includes("vibe check")) {
            nextLeadStatus = "converted";
          } else if (titleLower.includes("booking") || titleLower.includes("traveler")) {
            nextLeadStatus = "converted";
          }
        } else if (status === "in progress") {
          const titleLower = task.title.toLowerCase();
          if (titleLower.includes("vibe check")) {
            nextLeadStatus = "negotiating"; // Vibe Check sent
          }
        }

        if (nextLeadStatus) {
          await supabase
            .from("leads")
            .update({ status: nextLeadStatus })
            .eq("id", task.source_id);
        }
      } else if (task.source_kind === "trip" && task.source_id) {
        let nextTripStatus = "";
        if (status === "completed") {
          const titleLower = task.title.toLowerCase();
          if (titleLower.includes("archive") || titleLower.includes("complete")) {
            nextTripStatus = "completed";
          } else if (titleLower.includes("open") || titleLower.includes("enquiries")) {
            nextTripStatus = "active";
          }
        }
        if (nextTripStatus) {
          await supabase
            .from("trips")
            .update({ status: nextTripStatus })
            .eq("id", task.source_id);
        }
      }
    } catch (e) {
      console.warn("Failed to auto-advance workflow status:", e);
    }

    return data as DBTask;
  },

  async updateTaskSubtasks(id: string, subtasks: TaskSubtask[]): Promise<DBTask> {
    const { data, error } = await supabase
      .from("tasks")
      .update({ subtasks, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as DBTask;
  },

  async deleteTask(id: string): Promise<void> {
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }
};
