import { useEffect, useState, useCallback } from "react";
import { leadService } from "@/services/lead.service";
import { createClient } from "@/lib/supabase/client";
import { Lead } from "@/types/admin.types";

interface UseLeadsFilters {
  search?: string;
  status?: string;
  tripId?: string | null;
  isLead?: boolean | null;
}

export function useLeads(initialFilters?: UseLeadsFilters) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<UseLeadsFilters>(initialFilters || {});

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await leadService.getLeads(filters);
      setLeads(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch leads.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLeads();

    const supabase = createClient();
    const channel = supabase
      .channel("realtime-leads-list")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "leads",
        },
        () => {
          fetchLeads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLeads]);

  const updateFilters = (newFilters: Partial<UseLeadsFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const changeStatus = async (id: string, status: string) => {
    try {
      await leadService.updateLeadStatus(id, status);
      setLeads((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status } : l))
      );
    } catch (err: any) {
      setError(err.message || "Failed to update lead status.");
      throw err;
    }
  };

  return {
    leads,
    loading,
    error,
    filters,
    updateFilters,
    changeStatus,
    refresh: fetchLeads,
  };
}
