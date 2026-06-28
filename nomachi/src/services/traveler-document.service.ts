import { createClient } from "@/lib/supabase/client";
import { notificationService } from "./notification.service";
import { taskService } from "./task.service";

export type TravelerDocumentSubmission = {
  id: string;
  lead_id: string;
  user_id: string;
  trip_id?: string | null;
  traveler_index: number;
  full_name: string;
  date_of_birth?: string | null;
  gender?: string | null;
  document_type?: string | null;
  document_number?: string | null;
  mobile_number?: string | null;
  email?: string | null;
  address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_number?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  file_data_url?: string | null;
  status: string;
  created_at?: string | null;
  updated_at?: string | null;
};

export type TravelerDocumentInput = Omit<TravelerDocumentSubmission, "id" | "status" | "created_at" | "updated_at">;

const supabase = createClient();

export const travelerDocumentService = {
  async listByLead(leadId: string, userId?: string): Promise<TravelerDocumentSubmission[]> {
    let query = supabase
      .from("traveler_documents")
      .select("*")
      .eq("lead_id", leadId)
      .order("traveler_index", { ascending: true });

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as TravelerDocumentSubmission[];
  },

  async replaceForLead(params: {
    leadId: string;
    userId: string;
    tripId?: string | null;
    tripTitle?: string | null;
    assignedTo?: string | null;
    documents: TravelerDocumentInput[];
  }): Promise<TravelerDocumentSubmission[]> {
    const { leadId, userId, tripId, tripTitle, assignedTo, documents } = params;

    const { error: deleteError } = await supabase
      .from("traveler_documents")
      .delete()
      .eq("lead_id", leadId)
      .eq("user_id", userId);

    if (deleteError) throw deleteError;

    if (documents.length === 0) return [];

    const payload = documents.map((document, index) => ({
      ...document,
      lead_id: leadId,
      user_id: userId,
      trip_id: tripId || null,
      traveler_index: index + 1,
      status: "submitted",
    }));

    const { data, error } = await supabase
      .from("traveler_documents")
      .insert(payload)
      .select("*");

    if (error) throw error;

    if (assignedTo) {
      try {
        await notificationService.notifyManager(
          assignedTo,
          "Documents Submitted",
          `Traveler documents have been submitted for "${tripTitle || "your lead"}".`,
          "Documents Submitted",
          leadId,
          "High"
        );
      } catch (notifyError) {
        console.error("Failed to notify manager about document submission:", notifyError);
      }
    }

    try {
      await taskService.evaluateLeadWorkflow(leadId);
    } catch (workflowError) {
      console.error("Failed to advance workflow after document submission:", workflowError);
    }

    return ((data || []) as TravelerDocumentSubmission[]).sort((a, b) => a.traveler_index - b.traveler_index);
  },

  async updateStatus(documentId: string, status: TravelerDocumentSubmission["status"]): Promise<TravelerDocumentSubmission> {
    const { data, error } = await supabase
      .from("traveler_documents")
      .update({ status })
      .eq("id", documentId)
      .select("*")
      .single();

    if (error) throw error;
    return data as TravelerDocumentSubmission;
  },
};
