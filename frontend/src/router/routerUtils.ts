import type { Role } from "../store/authStore";

export function homeForRole(role: Role): string {
  return role === "owner" ? "/dashboard" : "/mon-espace";
}
