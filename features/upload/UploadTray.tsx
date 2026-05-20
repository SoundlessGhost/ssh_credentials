"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  CircleSlash,
  Eraser,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Upload as UploadIcon,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQueryClient } from "@tanstack/react-query";

import {
  useUploadQueue,
  type UploadItem,
  type UploadStatus,
} from "@/stores/uploadQueue";
import { useConnection } from "@/stores/connection";
import { uploadManager } from "@/features/upload/uploadManager";
import { formatBytes, formatEta, formatSpeed } from "@/lib/format";

export function UploadTray() {
  const items = useUploadQueue((s) => s.items);
  const order = useUploadQueue((s) => s.order);
  const sessionId = useConnection((s) => s.sessionId);
  const currentPath = useConnection((s) => s.currentPath);
  const qc = useQueryClient();
  const [collapsed, setCollapsed] = useState(false);

  const list = useMemo(
    () => order.map((id) => items[id]).filter(Boolean) as UploadItem[],
    [items, order],
  );

  // When an item flips to "done", refresh the directory listing it landed in.
  const lastSeen = useRef<Map<string, UploadStatus>>(new Map());
  useEffect(() => {
    if (!sessionId) return;
    const seen = lastSeen.current;
    const paths = new Set<string>();
    for (const item of list) {
      const prev = seen.get(item.id);
      if (prev !== "done" && item.status === "done") {
        paths.add(item.targetPath);
      }
      seen.set(item.id, item.status);
    }
    for (const p of paths) {
      qc.invalidateQueries({ queryKey: ["files", sessionId, p] });
    }
  }, [list, sessionId, qc]);

  if (list.length === 0) return null;

  const active = list.filter(
    (i) => i.status === "uploading" || i.status === "sftp",
  ).length;
  const done = list.filter((i) => i.status === "done").length;
  const failed = list.filter((i) => i.status === "error").length;

  return (
    <div className="w-[360px] overflow-hidden rounded-lg border bg-card shadow-2xl">
      <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2">
        <UploadIcon className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold">
          Uploads · {done}/{list.length} done
          {active > 0 && ` · ${active} active`}
          {failed > 0 && ` · ${failed} failed`}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            title="Clear finished"
            onClick={() => uploadManager.clearDone()}
          >
            <Eraser className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand uploads" : "Collapse uploads"}
          >
            {collapsed ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {!collapsed && (
        <ul className="max-h-[50vh] divide-y overflow-y-auto">
          {list.map((item) => (
            <UploadRow
              key={item.id}
              item={item}
              isCurrentPath={item.targetPath === currentPath}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function UploadRow({
  item,
  isCurrentPath,
}: {
  item: UploadItem;
  isCurrentPath: boolean;
}) {
  const startRef = useRef<number>(Date.now());
  const [speed, setSpeed] = useState(0);

  // Throttled speed estimate based on last sampled bytes.
  const lastBytesRef = useRef<number>(item.bytesUploaded);
  const lastTimeRef = useRef<number>(Date.now());
  useEffect(() => {
    const now = Date.now();
    const elapsed = (now - lastTimeRef.current) / 1000;
    if (elapsed > 0.4) {
      const delta = item.bytesUploaded - lastBytesRef.current;
      if (delta > 0) setSpeed(delta / elapsed);
      lastBytesRef.current = item.bytesUploaded;
      lastTimeRef.current = now;
    }
  }, [item.bytesUploaded]);

  const pct =
    item.totalBytes > 0
      ? Math.min(100, (item.bytesUploaded / item.totalBytes) * 100)
      : 0;

  const remaining =
    speed > 0 && item.totalBytes > 0
      ? (item.totalBytes - item.bytesUploaded) / speed
      : Number.POSITIVE_INFINITY;

  return (
    <li className="flex items-start gap-2 px-3 py-2 text-xs">
      <StatusIcon status={item.status} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium" title={item.file.name}>
            {item.file.name}
          </span>
          {!isCurrentPath && (
            <span
              className="shrink-0 truncate text-[10px] text-muted-foreground"
              title={item.targetPath}
            >
              → {item.targetPath}
            </span>
          )}
        </div>
        <Progress value={pct} className="mt-1 h-1" />
        <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>
            {formatBytes(item.bytesUploaded)} / {formatBytes(item.totalBytes)}
            {item.status === "uploading" && ` · ${formatSpeed(speed)} · ${formatEta(remaining)}`}
            {item.status === "sftp" && " · pushing to VPS"}
            {item.status === "queued" && " · queued"}
            {item.status === "paused" && " · paused"}
            {item.status === "cancelled" && " · cancelled"}
            {item.status === "error" && item.error && ` · ${item.error}`}
          </span>
        </div>
      </div>
      <RowActions item={item} />
    </li>
  );
}

function StatusIcon({ status }: { status: UploadStatus }) {
  switch (status) {
    case "done":
      return <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-500" />;
    case "error":
      return <AlertCircle className="mt-1 h-3.5 w-3.5 shrink-0 text-destructive" />;
    case "cancelled":
      return <CircleSlash className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
    case "uploading":
    case "sftp":
      return <Loader2 className="mt-1 h-3.5 w-3.5 shrink-0 animate-spin text-primary" />;
    case "paused":
      return <Pause className="mt-1 h-3.5 w-3.5 shrink-0 text-amber-500" />;
    default:
      return <UploadIcon className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
  }
}

function RowActions({ item }: { item: UploadItem }) {
  const s = item.status;
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      {(s === "uploading" || s === "sftp") && (
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          title="Pause"
          onClick={() => uploadManager.pause(item.id)}
        >
          <Pause className="h-3 w-3" />
        </Button>
      )}
      {s === "paused" && (
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          title="Resume"
          onClick={() => uploadManager.resume(item.id)}
        >
          <Play className="h-3 w-3" />
        </Button>
      )}
      {s === "error" && (
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          title="Retry"
          onClick={() => uploadManager.retry(item.id)}
        >
          <RotateCcw className="h-3 w-3" />
        </Button>
      )}
      {(s === "queued" ||
        s === "uploading" ||
        s === "sftp" ||
        s === "paused") && (
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-destructive hover:text-destructive"
          title="Cancel"
          onClick={() => uploadManager.cancel(item.id)}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
      {(s === "done" || s === "error" || s === "cancelled") && (
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          title="Remove"
          onClick={() => uploadManager.remove(item.id)}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
