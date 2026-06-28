import { useEffect, useState, useCallback } from "react";
import { tripService } from "@/services/trip.service";
import { createClient } from "@/lib/supabase/client";
import { Trip, Departure } from "@/types/admin.types";

interface UseTripsFilters {
  search?: string;
  status?: string;
  destination?: string;
  tripStyle?: string;
  difficulty?: string;
  sortBy?: string;
}

export function useTrips(initialFilters?: UseTripsFilters) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<UseTripsFilters>(
    initialFilters || {
      status: "all",
      destination: "all",
      tripStyle: "all",
      difficulty: "all",
      sortBy: "newest",
    }
  );

  const fetchTripsAndDepartures = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [tripsData, departuresData] = await Promise.all([
        tripService.getTrips(filters),
        tripService.getDepartures(),
      ]);
      setTrips(tripsData);
      setDepartures(departuresData);
    } catch (err: any) {
      setError(err.message || "Failed to load trips data.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTripsAndDepartures();

    const supabase = createClient();
    const channel = supabase
      .channel("realtime-trips-list")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trips",
        },
        () => {
          fetchTripsAndDepartures();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trip_departures",
        },
        () => {
          fetchTripsAndDepartures();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTripsAndDepartures]);

  const updateFilters = (newFilters: Partial<UseTripsFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const deleteTrip = async (id: string) => {
    try {
      await tripService.deleteTrip(id);
      setTrips((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      setError(err.message || "Failed to delete trip.");
      throw err;
    }
  };

  const archiveTrip = async (id: string) => {
    try {
      await tripService.archiveTrip(id);
      setTrips((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: "archived" } : t))
      );
    } catch (err: any) {
      setError(err.message || "Failed to archive trip.");
      throw err;
    }
  };

  const restoreTrip = async (id: string) => {
    try {
      await tripService.restoreTrip(id);
      setTrips((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: "draft" } : t))
      );
    } catch (err: any) {
      setError(err.message || "Failed to restore trip.");
      throw err;
    }
  };

  const openForEnquiries = async (id: string) => {
    try {
      await tripService.openForEnquiries(id);
      setTrips((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: "Open" } : t))
      );
    } catch (err: any) {
      setError(err.message || "Failed to open for enquiries.");
      throw err;
    }
  };

  const duplicateTrip = async (trip: Trip) => {
    try {
      const newTrip = await tripService.duplicateTrip(trip);
      setTrips((prev) => [newTrip, ...prev]);
      return newTrip;
    } catch (err: any) {
      setError(err.message || "Failed to duplicate trip.");
      throw err;
    }
  };

  return {
    trips,
    departures,
    loading,
    error,
    filters,
    updateFilters,
    deleteTrip,
    archiveTrip,
    restoreTrip,
    openForEnquiries,
    duplicateTrip,
    refresh: fetchTripsAndDepartures,
  };
}
