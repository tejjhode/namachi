import { useEffect, useState, useCallback } from "react";
import { tripService } from "@/services/trip.service";
import { Trip } from "@/types/admin.types";

export function useTrip(id: string | null) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchTrip = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await tripService.getTripById(id);
      setTrip(data);
    } catch (err: any) {
      setError(err.message || "Failed to load trip details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTrip();
  }, [fetchTrip]);

  const saveTrip = async (updates: Partial<Trip>): Promise<Trip> => {
    if (!id) throw new Error("No trip ID specified");
    try {
      setError(null);
      setSuccess(null);
      const updatedTrip = await tripService.updateTrip(id, updates);
      setTrip(updatedTrip);
      setSuccess("Trip saved successfully!");
      return updatedTrip;
    } catch (err: any) {
      setError(err.message || "Failed to save trip.");
      throw err;
    }
  };

  const activateDeparture = async (departureData: {
    startDate: string;
    endDate?: string;
    totalSeats: number;
    price: number;
    tripLeader?: string;
    meetingPoint?: string;
    notes?: string;
  }) => {
    if (!trip) throw new Error("No trip loaded to activate");
    try {
      setError(null);
      setSuccess(null);
      await tripService.activateTrip(trip, departureData);
      setSuccess("Departure activated successfully!");
      await fetchTrip();
    } catch (err: any) {
      setError(err.message || "Failed to activate departure.");
      throw err;
    }
  };

  return {
    trip,
    loading,
    error,
    success,
    setError,
    setSuccess,
    saveTrip,
    activateDeparture,
    refresh: fetchTrip,
  };
}
