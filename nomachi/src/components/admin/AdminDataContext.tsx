"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export interface Trip {
  id: string;
  title: string;
  destination?: string;
  start_date?: string;
  price?: number;
  status?: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  source?: string;
  trip_interest?: string;
  notes?: string;
  group_size?: number;
  created_at?: string;
  is_lead?: boolean;
  message?: string;
  preferred_month?: string;
  group_type?: string;
  hope_trip_feels_like?: string;
  dietary_and_accessibility?: string;
  budget_preference?: string;
  preferred_duration?: string;
  trips?: {
    title: string;
  };
}

interface AdminDataContextType {
  leads: Lead[];
  trips: Trip[];
  loading: boolean;
  refreshData: () => Promise<void>;
}

const AdminDataContext = createContext<AdminDataContextType | undefined>(undefined);

export function AdminDataProvider({ children }: { children: React.ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch leads with joined trip titles and all trip records
      const [leadsRes, tripsRes] = await Promise.all([
        supabase
          .from("leads")
          .select("*, trips(title)")
          .order("created_at", { ascending: false }),
        supabase.from("trips").select("*").order("title"),
      ]);

      if (leadsRes.data) setLeads(leadsRes.data as Lead[]);
      if (tripsRes.data) setTrips(tripsRes.data as Trip[]);
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("admin-context-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        () => {
          fetchData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trips" },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <AdminDataContext.Provider value={{ leads, trips, loading, refreshData: fetchData }}>
      {children}
    </AdminDataContext.Provider>
  );
}

export function useAdminData() {
  const context = useContext(AdminDataContext);
  if (context === undefined) {
    throw new Error("useAdminData must be used within an AdminDataProvider");
  }
  return context;
}