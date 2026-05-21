"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Archive,
  Check,
  CircleSlash,
  Eraser,
  Loader2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  useCompressJobs,
  type CompressJob,
  type CompressJobStatus,
} from "@/stores/compressJobs";
import { cancelCompress } from "@/features/files/compressManager";
import { formatEta } from "@/lib/format";

export function CompressTray() {
  const jobs = useCompressJobs((s) => s.jobs);
  const order = useCompressJobs((s) => s.order);
  const clearDone = useCompressJobs((s) => s.clearDone);
  const remove = useCompressJobs((s) => s.remove);

  const list = useMemo(
    () => order.map((id) => jobs[id]).filter(Boolean) as CompressJob[],
    [jobs, order],
  );

  if (list.length === 0) return null;

  const active = list.filter((j) => j.status === "running").length;
  const done = list.filter((j) => j.status === "done").length;
  const failed = list.filter((j) => j.status === "error").length;

  return (
    <div className="w-[360px] overflow-hidden rounded-lg border bg-card shadow-2xl">
      <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2">
        <Archive className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold">
          Compress · {done}/{list.length} Done
          {active > 0 && ` · ${active} active`}
          {failed > 0 && ` · ${failed} failed`}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            title="Clear finished"
            onClick={() => clearDone()}
          >
            <Eraser className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <ul className="max-h-[40vh] divide-y overflow-y-auto">
        {list.map((job) => (
          <CompressRow key={job.id} job={job} onRemove={() => remove(job.id)} />
        ))}
      </ul>
    </div>
  );
}

function CompressRow({
  job,
  onRemove,
}: {
  job: CompressJob;
  onRemove: () => void;
}) {
  // Live-ticking elapsed (server elapsed only updates each poll cycle).
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (job.status !== "running") return;
    const i = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(i);
  }, [job.status]);

  const elapsedMs =
    job.status === "running"
      ? Date.now() - job.startedAt
      : (job.finishedAt ?? Date.now()) - job.startedAt;
  // Squelch unused-tick lint
  void tick;

  return (
    <li className="flex items-start gap-2 px-3 py-2 text-xs">
      <StatusIcon status={job.status} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium" title={job.destPath}>
            {job.destName}
          </span>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {job.format}
          </span>
        </div>
        {job.status === "running" ? (
          <div className="relative mt-1 h-1 overflow-hidden rounded-full bg-primary/20">
            <div className="absolute inset-y-0 w-1/3 animate-[slide_1.4s_linear_infinite] rounded-full bg-primary" />
          </div>
        ) : (
          <div className="mt-1 h-1" />
        )}
        <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>
            {job.status === "running" && `compressing · ${formatEta(elapsedMs / 1000)}`}
            {job.status === "done" && `done · ${formatEta(elapsedMs / 1000)}`}
            {job.status === "cancelled" && "cancelled"}
            {job.status === "error" && (job.error || "failed")}
          </span>
        </div>
      </div>
      <RowActions job={job} onRemove={onRemove} />
    </li>
  );
}

function StatusIcon({ status }: { status: CompressJobStatus }) {
  switch (status) {
    case "done":
      return <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-500" />;
    case "error":
      return (
        <AlertCircle className="mt-1 h-3.5 w-3.5 shrink-0 text-destructive" />
      );
    case "cancelled":
      return (
        <CircleSlash className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      );
    case "running":
    default:
      return (
        <Loader2 className="mt-1 h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
      );
  }
}

function RowActions({
  job,
  onRemove,
}: {
  job: CompressJob;
  onRemove: () => void;
}) {
  if (job.status === "running") {
    return (
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 text-destructive hover:text-destructive"
        title="Cancel"
        onClick={() => cancelCompress(job.id)}
      >
        <X className="h-3 w-3" />
      </Button>
    );
  }
  return (
    <Button
      size="icon"
      variant="ghost"
      className="h-6 w-6"
      title="Remove"
      onClick={onRemove}
    >
      <X className="h-3 w-3" />
    </Button>
  );
}
