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

export type AdminSession = {
  session_id: string;
  user_id: string | null;
  user_email: string | null;
  hostname: string | null;
  created_at: string | null;
};

export type AdminAuditQuery = {
  limit?: number;
  offset?: number;
  action?: string;
  user_email?: string;
};

export const adminApi = {
  stats: () => api<AdminStats>("/api/admin/stats"),
  users: () => api<AdminUser[]>("/api/admin/users"),
  toggleAdmin: (id: string, is_admin: boolean) =>
    api<AdminUser>(`/api/admin/users/${id}`, {
      method: "PATCH",
      json: { is_admin },
    }),
  deleteUser: (id: string) =>
    api<{ success: boolean }>(`/api/admin/users/${id}`, {
      method: "DELETE",
    }),
  resetPassword: (id: string) =>
    api<{ temp_password: string }>(
      `/api/admin/users/${id}/reset-password`,
      { method: "POST" },
    ),
  disconnectUser: (id: string) =>
    api<{ success: boolean; killed: number }>(
      `/api/admin/users/${id}/disconnect`,
      { method: "POST" },
    ),
  audit: (q: AdminAuditQuery = {}) =>
    api<AdminAuditEntry[]>("/api/admin/audit", {
      query: {
        limit: q.limit ?? 100,
        offset: q.offset ?? 0,
        ...(q.action ? { action: q.action } : {}),
        ...(q.user_email ? { user_email: q.user_email } : {}),
      },
    }),
  sessions: () => api<AdminSession[]>("/api/admin/sessions"),
  killSession: (sid: string) =>
    api<{ success: boolean }>(`/api/admin/sessions/${sid}`, {
      method: "DELETE",
    }),
};
