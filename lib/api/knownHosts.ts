// Known-hosts (TOFU) client.

import { api } from "@/lib/api/client";

export type KnownHost = {
  id: string;
  host: string;
  port: number;
  key_type: string;
  fingerprint_sha256: string;
  created_at: string;
};

export type TrustHostKeyBody = {
  host: string;
  port: number;
  key_type: string;
  key_b64: string;
};

export const knownHostsApi = {
  list: () => api<KnownHost[]>("/api/known-hosts"),
  trust: (body: TrustHostKeyBody) =>
    api<KnownHost>("/api/known-hosts", { method: "POST", json: body }),
  remove: (id: string) =>
    api<null>(`/api/known-hosts/${id}`, { method: "DELETE" }),
};
