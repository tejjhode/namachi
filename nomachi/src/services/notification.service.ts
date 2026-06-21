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
    const response = await fetch("/api/notifications/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error || "Failed to create notification");
    }

    return response.json();
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
        .or("role.eq.admin,role.eq.ADMIN");
      if (admins && admins.length > 0) {
        await Promise.all(
          admins.map((admin) =>
            this.createNotification({
              user_id: admin.id,
              title,
              body,
              type,
              priority,
              source_id: sourceId,
            })
          )
        );
      }
    } catch (err) {
      console.error("Failed to notify admins:", err);
    }
  },
};
