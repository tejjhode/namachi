import { useEffect, useState, useCallback } from "react";
import { leadService } from "@/services/lead.service";
import { Lead, LeadNote } from "@/types/admin.types";

export function useLead(id: string | null) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLead = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await leadService.getLeadById(id);
      setLead(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch lead details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  const changeStatus = async (status: string) => {
    if (!id) return;
    try {
      await leadService.updateLeadStatus(id, status);
      await fetchLead();
    } catch (err: any) {
      setError(err.message || "Failed to change lead status.");
      throw err;
    }
  };

  const addNote = async (noteText: string, authorId: string): Promise<LeadNote> => {
    if (!id) throw new Error("No lead ID specified");
    try {
      const newNote = await leadService.addLeadNote(id, noteText, authorId);
      await fetchLead();
      return newNote;
    } catch (err: any) {
      setError(err.message || "Failed to add note.");
      throw err;
    }
  };

  return {
    lead,
    loading,
    error,
    changeStatus,
    addNote,
    refresh: fetchLead,
  };
}
