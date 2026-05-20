// Saved-servers backend client. Credentials live in the encrypted vault;
// the frontend never holds them after creation.

import { api } from "@/lib/api/client";

export type AuthType = "password" | "key";

export type SavedServer = {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  auth_type: AuthType;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ServerCreateBody = {
  name: string;
  host: string;
  port: number;
  username: string;
  auth_type: AuthType;
  password?: string;
  private_key?: string;
};

export type ServerUpdateBody = Partial<ServerCreateBody>;

export type ServerConnectResponse = {
  success: boolean;
  session_id: string;
  server_id: string;
  currentDir?: string;
  hostname?: string;
  os?: string;
  message?: string;
};

export type HostKeyRequired = {
  requires_host_key_confirmation: true;
  host: string;
  port: number;
  key_type: string;
  key_b64: string;
  fingerprint_sha256: string;
};

export const serversApi = {
  list: () => api<SavedServer[]>("/api/servers"),
  create: (body: ServerCreateBody) =>
    api<SavedServer>("/api/servers", { method: "POST", json: body }),
  update: (id: string, body: ServerUpdateBody) =>
    api<SavedServer>(`/api/servers/${id}`, { method: "PATCH", json: body }),
  remove: (id: string) =>
    api<null>(`/api/servers/${id}`, { method: "DELETE" }),
  connect: (id: string) =>
    api<ServerConnectResponse>(`/api/servers/${id}/connect`, { method: "POST" }),
};
