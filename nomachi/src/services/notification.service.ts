import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  priority: string;
  source_id?: string | null;
  is_read: boolean;
  created_at: string;
}

export const notificationService = {
  async getNotifications(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);
    if (error) throw error;
  },

  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    if (error) throw error;
  },

  async createNotification(payload: {
    user_id: string;
    title: string;
    body: string;
    type: string;
    priority?: string;
    source_id?: string | null;
  }): Promise<Notification> {
    const { data, error } = await supabase
      .from("notifications")
      .insert([
        {
          user_id: payload.user_id,
          title: payload.title,
          body: payload.body,
          type: payload.type,
          priority: payload.priority || "Medium",
          source_id: payload.source_id || null,
          is_read: false,
        },
      ])
      .select()
      .single();
    if (error) throw error;

    // Async simulated delivery trigger
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, phone, role")
        .eq("id", payload.user_id)
        .maybeSingle();

      if (profile) {
        const rawRole = profile.role || "user";
        const role = rawRole.toLowerCase();
        const titleLower = payload.title.toLowerCase();
        const typeLower = payload.type.toLowerCase();

        let sendEmailTo = "";
        let sendWATo = "";

        // 1. Email Delivery Check
        if (role === "user") {
          // Traveler bookings/payments
          const matchesEmail =
            titleLower.includes("booking confirmed") ||
            titleLower.includes("payment reminder") ||
            titleLower.includes("payment received") ||
            titleLower.includes("payment failure") ||
            titleLower.includes("refunded") ||
            typeLower.includes("booking") ||
            typeLower.includes("payment");
          if (matchesEmail && profile.email) {
            sendEmailTo = profile.email;
          }
        } else if (role === "manager" || role === "staff") {
          // Manager assignments/overdue
          const matchesEmail =
            titleLower.includes("assigned") ||
            titleLower.includes("overdue") ||
            titleLower.includes("follow-up") ||
            titleLower.includes("reminder") ||
            typeLower.includes("assign") ||
            typeLower.includes("overdue") ||
            typeLower.includes("task");
          if (matchesEmail && profile.email) {
            sendEmailTo = profile.email;
          }
        } else if (role === "admin") {
          // Admin digests/critical alerts
          const matchesEmail =
            titleLower.includes("failure") ||
            titleLower.includes("unassigned") ||
            titleLower.includes("new enquiry") ||
            typeLower.includes("failure") ||
            typeLower.includes("unassigned") ||
            typeLower.includes("enquiry");
          if (matchesEmail && profile.email) {
            sendEmailTo = profile.email;
          }
        }

        // 2. WhatsApp Delivery Check (Traveler-facing only)
        if (role === "user") {
          const matchesWA =
            titleLower.includes("booking confirmed") ||
            titleLower.includes("payment reminder") ||
            titleLower.includes("departure reminder") ||
            titleLower.includes("trip starts tomorrow") ||
            typeLower.includes("booking confirmed") ||
            typeLower.includes("payment reminder") ||
            typeLower.includes("departure reminder");
          if (matchesWA && profile.phone) {
            sendWATo = profile.phone;
          }
        }

        // Trigger delivery endpoint if any matches
        if (sendEmailTo || sendWATo) {
          fetch("/api/notifications/deliver", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: sendEmailTo || undefined,
              phone: sendWATo || undefined,
              title: payload.title,
              body: payload.body,
              priority: payload.priority || "Medium",
              type: payload.type,
            }),
          }).catch((err) => console.error("Notification delivery dispatch error:", err));
        }
      }
    } catch (err) {
      console.error("Failed to run channel checks:", err);
    }

    return data;
  },

  // Role-based triggers helper logic
  async notifyTraveler(
    email: string,
    title: string,
    body: string,
    type: string,
    sourceId?: string | null,
    priority: string = "Medium"
  ): Promise<void> {
    if (!email) return;
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .single();
      if (profile?.id) {
        await this.createNotification({
          user_id: profile.id,
          title,
          body,
          type,
          priority,
          source_id: sourceId,
        });
      }
    } catch (err) {
      console.error("Failed to notify traveler:", err);
    }
  },

  async notifyManager(
    managerId: string | null,
    title: string,
    body: string,
    type: string,
    sourceId?: string | null,
    priority: string = "Medium"
  ): Promise<void> {
    if (!managerId) return;
    try {
      await this.createNotification({
        user_id: managerId,
        title,
        body,
        type,
        priority,
        source_id: sourceId,
      });
    } catch (err) {
      console.error("Failed to notify manager:", err);
    }
  },

  async notifyAdmins(
    title: string,
    body: string,
    type: string,
    sourceId?: string | null,
    priority: string = "Medium"
  ): Promise<void> {
    try {
      const { data: admins } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "ADMIN");
      if (admins && admins.length > 0) {
        const inserts = admins.map((admin) => ({
          user_id: admin.id,
          title,
          body,
          type,
          priority,
          source_id: sourceId || null,
          is_read: false,
        }));
        await supabase.from("notifications").insert(inserts);
      }
    } catch (err) {
      console.error("Failed to notify admins:", err);
    }
  },
};
