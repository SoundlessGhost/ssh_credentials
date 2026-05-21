// Tracks in-flight compress jobs so the CompressTray can render a
// per-job progress row with elapsed time + cancel.
//
// Lives in its own store rather than piggy-backing on uploadQueue because
// the lifecycle (poll-driven, no chunked bytes) is different.

import { create } from "zustand";

export type CompressJobStatus =
  | "running"
  | "done"
  | "error"
  | "cancelled";

export type CompressJob = {
  id: string;            // backend job_id
  destName: string;      // basename for the row label
  destPath: string;      // full path on the VPS
  format: string;        // "zip" | "tar.gz"
  status: CompressJobStatus;
  startedAt: number;     // ms, browser-local for elapsed display
  finishedAt?: number;
  elapsed: number;       // seconds (from server poll)
  error?: string;
};

type CompressJobsState = {
  jobs: Record<string, CompressJob>;
  order: string[];

  add: (job: CompressJob) => void;
  update: (id: string, patch: Partial<CompressJob>) => void;
  remove: (id: string) => void;
  clearDone: () => void;
};

export const useCompressJobs = create<CompressJobsState>((set) => ({
  jobs: {},
  order: [],

  add: (job) =>
    set((s) => ({
      jobs: { ...s.jobs, [job.id]: job },
      order: [...s.order, job.id],
    })),

  update: (id, patch) =>
    set((s) =>
      s.jobs[id]
        ? { jobs: { ...s.jobs, [id]: { ...s.jobs[id], ...patch } } }
        : s,
    ),

  remove: (id) =>
    set((s) => {
      if (!s.jobs[id]) return s;
      const { [id]: _gone, ...rest } = s.jobs;
      return {
        jobs: rest,
        order: s.order.filter((x) => x !== id),
      };
    }),

  clearDone: () =>
    set((s) => {
      const keepIds = s.order.filter((id) => s.jobs[id]?.status === "running");
      const keep: Record<string, CompressJob> = {};
      for (const id of keepIds) keep[id] = s.jobs[id];
      return { jobs: keep, order: keepIds };
    }),
}));
