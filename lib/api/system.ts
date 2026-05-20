// System monitor API client.

import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";

export type SystemInfo = {
  cpuPercent: number;
  memory: { totalGb: number; usedGb: number; percent: number };
  disk: { total: string; used: string; percent: number };
  uptimeSeconds: number;
  hostname: string;
  os: string;
};

export type ProcessRow = {
  pid: number;
  cpuPercent: number;
  memoryPercent: number;
  status: string;
  command: string;
};

export const systemApi = {
  info: (sessionId: string) =>
    api<{ success: boolean; data: SystemInfo }>(endpoints.ssh.systemInfo, {
      query: { session_id: sessionId },
    }),
  processes: (sessionId: string) =>
    api<{ success: boolean; processes: ProcessRow[] }>(endpoints.ssh.processes, {
      query: { session_id: sessionId },
    }),
  kill: (sessionId: string, pid: number, action: "kill" | "terminate" = "terminate") =>
    api<{ success: boolean; pid?: number; error?: string }>(
      endpoints.ssh.killProcess,
      { method: "POST", json: { session_id: sessionId, pid, action } },
    ),
};
