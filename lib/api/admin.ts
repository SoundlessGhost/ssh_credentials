// Admin API client. All endpoints require is_admin=true (else 404).

import { api } from "@/lib/api/client";

export type AdminStats = {
  total_users: number;
  total_admins: number;
  total_servers: number;
  total_known_hosts: number;
  active_sessions: number;
  audit_events_last_24h: number;
};

export type AdminUser = {
  id: string;
  email: string;
  is_admin: boolean;
  email_verified_at: string | null;
  created_at: string;
  server_count: number;
  known_host_count: number;
};

export type AdminAuditEntry = {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  target: string | null;
  ip: string | null;
  detail: string | null;
  created_at: string;
};

export const adminApi = {
  stats: () => api<AdminStats>("/api/admin/stats"),
  users: () => api<AdminUser[]>("/api/admin/users"),
  toggleAdmin: (id: string, is_admin: boolean) =>
    api<AdminUser>(`/api/admin/users/${id}`, {
      method: "PATCH",
      json: { is_admin },
    }),
  audit: (limit = 100, offset = 0) =>
    api<AdminAuditEntry[]>("/api/admin/audit", { query: { limit, offset } }),
};
