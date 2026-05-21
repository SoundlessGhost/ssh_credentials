// Compress job lifecycle outside React. The /api/ssh/zip POST kicks off
// a background tar/zip on the VPS and returns a job_id; this module
// then polls /zip-progress at 1 Hz until the job hits a terminal state,
// updates the Zustand store, and fires `onDone` so callers can refresh
// their query cache.

import { toast } from "sonner";
import type { QueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { useCompressJobs, type CompressJob } from "@/stores/compressJobs";

type StartZipResponse = {
  success: boolean;
  job_id: string;
  path: string;
  format: string;
};

type ProgressResponse = {
  id: string;
  status: CompressJob["status"];
  path: string;
  format: string;
  elapsed: number;
  error?: string | null;
};

export type StartCompressArgs = {
  sessionId: string;
  paths: string[];
  destPath: string; // absolute path on VPS
  destName: string; // basename for the row label
  qc: QueryClient;
  invalidatePath: string;
};

/**
 * Kick off a compress job. Returns the job_id once the backend has
 * accepted the work. Polling continues in the background.
 */
export async function startCompress(args: StartCompressArgs): Promise<string> {
  const res = await api<StartZipResponse>(endpoints.ssh.zip, {
    method: "POST",
    json: {
      session_id: args.sessionId,
      paths: args.paths,
      dest_path: args.destPath,
    },
  });

  const store = useCompressJobs.getState();
  store.add({
    id: res.job_id,
    destName: args.destName,
    destPath: res.path,
    format: res.format,
    status: "running",
    startedAt: Date.now(),
    elapsed: 0,
  });

  // Fire-and-forget poll loop.
  void pollUntilDone(res.job_id, args);
  return res.job_id;
}

async function pollUntilDone(
  jobId: string,
  args: StartCompressArgs,
): Promise<void> {
  const store = useCompressJobs.getState();

  // Bounded loop in case the server returns 404 repeatedly (e.g. backend
  // restarted while we were polling). Stops after ~6 hours of polling.
  for (let i = 0; i < 21600; i++) {
    await sleep(1000);
    let p: ProgressResponse;
    try {
      p = await api<ProgressResponse>(endpoints.ssh.zipProgress, {
        query: { job_id: jobId },
      });
    } catch (err) {
      // 404 means the backend dropped the job (GC or restart). Mark
      // error so the row gets a Retry-friendly state.
      store.update(jobId, {
        status: "error",
        error: err instanceof Error ? err.message : "lost",
        finishedAt: Date.now(),
      });
      return;
    }
    store.update(jobId, {
      status: p.status,
      elapsed: p.elapsed,
      error: p.error ?? undefined,
    });
    if (p.status !== "running") {
      store.update(jobId, { finishedAt: Date.now() });
      args.qc.invalidateQueries({
        queryKey: ["files", args.sessionId, args.invalidatePath],
      });
      if (p.status === "done") {
        toast.success(`Created ${args.destName}`);
      } else if (p.status === "cancelled") {
        toast.message(`Cancelled compress of ${args.destName}`);
      } else {
        toast.error(p.error || `Compress failed: ${args.destName}`);
      }
      return;
    }
  }
}

export async function cancelCompress(jobId: string): Promise<void> {
  try {
    await api(endpoints.ssh.zipCancel, {
      method: "POST",
      query: { job_id: jobId },
    });
    useCompressJobs
      .getState()
      .update(jobId, { status: "cancelled", finishedAt: Date.now() });
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Cancel failed");
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
