export type AppRole = "ADMIN" | "MANAGER" | "STAFF" | "USER";

export const normalizeRole = (role?: string | null) => (role || "").trim().toUpperCase();

export const isAdminRole = (role?: string | null) => normalizeRole(role) === "ADMIN";

export const isManagerRole = (role?: string | null) => normalizeRole(role) === "MANAGER";

export const isManagerOrAdminRole = (role?: string | null) => {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === "ADMIN" || normalizedRole === "MANAGER";
};
