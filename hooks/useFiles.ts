// React Query hook for the file list. Caches by (sessionId, path).
// Step 7 wires this into the FileList component.

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";

export type FileItem = {
  name: string;
  type: "file" | "folder";
  path: string;
  size: number;
  sizeStr: string;
  modified: string;
  permissions: string;
};

type ListResponse = {
  success: boolean;
  path: string;
  items: FileItem[];
};

export function useFiles(sessionId: string | null, path: string) {
  return useQuery({
    queryKey: ["files", sessionId, path],
    enabled: !!sessionId,
    queryFn: () =>
      api<ListResponse>(endpoints.ssh.list, {
        query: { session_id: sessionId ?? "", path },
      }),
    staleTime: 2000,
  });
}
