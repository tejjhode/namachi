import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/types/admin.types";

const supabase = createClient();

export const userService = {
  async getUsers(): Promise<Profile[]> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name");

    if (error) throw error;
    return (data || []) as Profile[];
  },

  async updateUserRole(id: string, role: string): Promise<Profile> {
    const { data, error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Profile;
  },
};
