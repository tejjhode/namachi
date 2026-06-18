import { createClient } from "@/lib/supabase/client";
import { Lead, LeadNote } from "@/types/admin.types";

const supabase = createClient();

export const leadService = {
  async getLeads(params?: {
    search?: string;
    status?: string;
    tripId?: string | null;
  }): Promise<Lead[]> {
    let query = supabase.from("leads").select("*, trips(id, title, destination)").order("created_at", { ascending: false });

    if (params?.status && params.status !== "all") {
      query = query.eq("status", params.status);
    }

    if (params?.tripId) {
      query = query.eq("trip_id", params.tripId);
    }

    if (params?.search) {
      query = query.or(`name.ilike.%${params.search}%,email.ilike.%${params.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const leads = (data || []) as Lead[];
    const profileIds = Array.from(
      new Set(
        leads
          .map((lead) => lead.assigned_to)
          .filter((value): value is string => Boolean(value))
      )
    );

    if (profileIds.length === 0) {
      return leads;
    }

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", profileIds);

    if (profilesError) {
      return leads;
    }

    const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));
    return leads.map((lead) => ({
      ...lead,
      profiles: lead.assigned_to ? profileMap.get(lead.assigned_to) : undefined,
    }));
  },

  async getLeadById(id: string): Promise<Lead> {
    const { data, error } = await supabase
      .from("leads")
      .select("*, trips(id, title, destination), lead_notes(id, lead_id, content, created_at)")
      .eq("id", id)
      .single();

    if (error) throw error;
    
    // Sort notes chronologically and map content to note_text
    if (data.lead_notes) {
      data.lead_notes = data.lead_notes.map((note: any) => ({
        ...note,
        note_text: note.content
      }));
      data.lead_notes.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }

    return data as Lead;
  },

  async createLead(lead: Omit<Lead, "id" | "created_at">): Promise<Lead> {
    const { data, error } = await supabase
      .from("leads")
      .insert([lead])
      .select()
      .single();

    if (error) throw error;
    return data as Lead;
  },

  async updateLead(id: string, updates: Partial<Lead>): Promise<Lead> {
    const { data, error } = await supabase
      .from("leads")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Lead;
  },

  async updateLeadStatus(id: string, status: string): Promise<Lead> {
    return this.updateLead(id, { status });
  },

  async addLeadNote(leadId: string, noteText: string, authorId: string): Promise<LeadNote> {
    const { data, error } = await supabase
      .from("lead_notes")
      .insert([
        {
          lead_id: leadId,
          content: noteText,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      note_text: data.content
    } as LeadNote;
  },
};
