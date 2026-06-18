"use client";

import { useUsers } from "@/hooks/useUsers";
import { Loader2, ShieldAlert, CheckCircle, Search, Mail, Shield } from "lucide-react";
import { useState } from "react";

export default function UsersPage() {
  const { users, loading, error, changeUserRole, refresh } = useUsers();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [success, setSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      setUpdatingId(userId);
      setSuccess("");
      await changeUserRole(userId, newRole);
      setSuccess("User role updated successfully!");
    } catch (err: any) {
      alert(err.message || "Failed to update role.");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const nameMatch = u.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const emailMatch = u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || emailMatch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300 text-left">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-extrabold text-nomichi-ink">Role Manager</h1>
        <p className="text-xs text-nomichi-ink/40 font-semibold mt-0.5">
          View registered profiles and assign admin roles.
        </p>
      </div>

      {/* Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-4 pr-9.5 py-2.5 bg-white border border-[#e7e1d5] rounded-xl text-xs font-semibold placeholder-nomichi-ink/30 text-nomichi-ink focus:outline-none focus:border-[#FF5B26]"
          />
          <Search className="w-4 h-4 text-nomichi-ink/30 absolute right-3.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Success Alert */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2.5">
          <CheckCircle className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
          {success}
        </div>
      )}

      {/* Users Table Card */}
      <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#FF5B26] animate-spin" />
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-500 font-semibold">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-[#FAF8F4] border-b border-[#e7e1d5]/30">
                  <th className="px-6 py-3.5 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">User</th>
                  <th className="px-6 py-3.5 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3.5 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3.5 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Joined Date</th>
                  <th className="px-6 py-3.5 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e7e1d5]/20">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-nomichi-ink/40 font-semibold">
                      No users match your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const firstName = user.full_name?.split(" ")[0] || "User";
                    const formattedDate = user.created_at
                      ? new Date(user.created_at).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—";

                    return (
                      <tr key={user.id} className="hover:bg-[#FAF8F4]/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-nomichi-ink">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full overflow-hidden border border-[#e7e1d5]/50 bg-[#FFECE5] flex items-center justify-center font-bold text-[#FF5B26] text-xs shrink-0">
                              {user.avatar_url ? (
                                <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                              ) : (
                                firstName.charAt(0).toUpperCase()
                              )}
                            </div>
                            <span>{user.full_name || "No Name"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-nomichi-ink/85">
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-nomichi-ink/30 shrink-0" />
                            <span>{user.email || "No Email"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-nomichi-ink/75">{user.phone || "—"}</td>
                        <td className="px-6 py-4 text-nomichi-ink/75">{formattedDate}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {updatingId === user.id ? (
                              <Loader2 className="w-4 h-4 text-[#FF5B26] animate-spin" />
                            ) : (
                              <select
                                value={user.role?.toLowerCase() || "user"}
                                onChange={(e) => handleRoleChange(user.id, e.target.value.toUpperCase())}
                                className={`px-2 py-1.5 border border-[#e7e1d5] rounded-xl text-[11px] font-bold cursor-pointer bg-white ${
                                  user.role?.toLowerCase() === "admin"
                                    ? "text-[#FF5B26] border-[#FF5B26]/30 bg-[#FFEFEA]/20"
                                    : user.role?.toLowerCase() === "manager"
                                    ? "text-blue-600 border-blue-200 bg-blue-50/20"
                                    : "text-nomichi-ink/70"
                                }`}
                              >
                                <option value="user">User</option>
                                <option value="manager">Manager</option>
                                <option value="admin">Admin</option>
                              </select>
                            )}
                            {user.role?.toLowerCase() === "admin" && (
                              <span title="Admin User">
                                <Shield className="w-3.5 h-3.5 text-[#FF5B26]" />
                              </span>
                            )}
                            {user.role?.toLowerCase() === "manager" && (
                              <span title="Manager User">
                                <Shield className="w-3.5 h-3.5 text-blue-600" />
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
