"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/lib/api/client";
import {
  serversApi,
  type SavedServer,
  type ServerCreateBody,
  type ServerUpdateBody,
} from "@/lib/api/servers";

const SERVERS_KEY = ["servers"] as const;

export function useServers() {
  return useQuery<SavedServer[]>({
    queryKey: SERVERS_KEY,
    queryFn: serversApi.list,
    retry: (failureCount, err) => {
      if (err instanceof ApiError && err.status === 401) return false;
      return failureCount < 1;
    },
  });
}

export function useCreateServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ServerCreateBody) => serversApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: SERVERS_KEY }),
  });
}

export function useUpdateServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ServerUpdateBody }) =>
      serversApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: SERVERS_KEY }),
  });
}

export function useDeleteServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => serversApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: SERVERS_KEY }),
  });
}

export function useConnectServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => serversApi.connect(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: SERVERS_KEY }),
  });
}
