"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/client";
import { systemApi } from "@/lib/api/system";

export function useSystemInfo(sessionId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["system", "info", sessionId],
    enabled: !!sessionId && enabled,
    queryFn: () => systemApi.info(sessionId!),
    refetchInterval: 3_000,
    retry: (count, err) =>
      err instanceof ApiError && err.status === 404 ? false : count < 1,
  });
}

export function useProcesses(sessionId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["system", "processes", sessionId],
    enabled: !!sessionId && enabled,
    queryFn: () => systemApi.processes(sessionId!),
    refetchInterval: 4_000,
    retry: (count, err) =>
      err instanceof ApiError && err.status === 404 ? false : count < 1,
  });
}
