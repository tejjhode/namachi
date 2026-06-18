import { useEffect, useState } from "react";
import { userService } from "@/services/user.service";
import { Profile } from "@/types/admin.types";

export function useUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await userService.getUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || "Failed to load users list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const changeUserRole = async (id: string, role: string) => {
    try {
      await userService.updateUserRole(id, role);
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, role } : u))
      );
    } catch (err: any) {
      setError(err.message || "Failed to update user role.");
      throw err;
    }
  };

  return {
    users,
    loading,
    error,
    changeUserRole,
    refresh: fetchUsers,
  };
}
