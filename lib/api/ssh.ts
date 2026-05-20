// SSH lifecycle API helpers. Used by the connection dialog and the
// server sidebar to attach / detach the current SSH session.

import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";

export type ConnectResponse = {
  success: boolean;
  session_id: string;
  message?: string;
  currentDir?: string;
  hostname?: string;
  os?: string;
};

export type ConnectInput = {
  host: string;
  port: number;
  username: string;
  password?: string;
  private_key?: string;
};

export function connectSSH(input: ConnectInput) {
  return api<ConnectResponse>(endpoints.ssh.connect, {
    method: "POST",
    json: input,
  });
}

export function disconnectSSH(sessionId: string) {
  return api<{ success: boolean }>(endpoints.ssh.disconnect, {
    method: "POST",
    query: { session_id: sessionId },
  });
}
