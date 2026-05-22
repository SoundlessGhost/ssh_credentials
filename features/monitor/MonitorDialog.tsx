"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Cpu,
  HardDrive,
  Loader2,
  MemoryStick,
  Skull,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

import { useConnection } from "@/stores/connection";
import { useMonitorUi } from "@/stores/monitorUi";
import { useProcesses, useSystemInfo } from "@/hooks/useSystem";
import { systemApi } from "@/lib/api/system";

function formatUptime(s: number): string {
  if (!s || s < 0) return "—";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function pctColor(p: number): string {
  if (p >= 90) return "bg-red-500";
  if (p >= 70) return "bg-amber-500";
  return "bg-emerald-500";
}

export function MonitorDialog() {
  const open = useMonitorUi((s) => s.open);
  const setOpen = useMonitorUi((s) => s.setOpen);
  const sessionId = useConnection((s) => s.sessionId);
  const hostname = useConnection((s) => s.hostname);

  const { data: sys, isLoading: sysLoading } = useSystemInfo(sessionId, open);
  const { data: procs, isLoading: procLoading } = useProcesses(sessionId, open);
  const qc = useQueryClient();
  const [pendingKill, setPendingKill] = useState<number | null>(null);

  const killMut = useMutation({
    mutationFn: ({ pid, action }: { pid: number; action: "kill" | "terminate" }) =>
      systemApi.kill(sessionId!, pid, action),
    onSuccess: (_, vars) => {
      toast.success(`Sent ${vars.action} to PID ${vars.pid}`);
      qc.invalidateQueries({ queryKey: ["system", "processes", sessionId] });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Kill failed");
    },
    onSettled: () => setPendingKill(null),
  });

  const info = sys?.data;
  const procRows = procs?.processes ?? [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="flex h-[85vh] max-h-[85vh] flex-col gap-3 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            System Monitor
            {hostname && (
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {hostname}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {!sessionId ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            Connect to a server first.
          </div>
        ) : (
          <>
            {/* Stat tiles */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatTile
                icon={<Cpu className="h-4 w-4" />}
                label="CPU"
                value={
                  sysLoading || !info
                    ? "—"
                    : `${info.cpuPercent.toFixed(1)}%`
                }
                percent={info?.cpuPercent}
              />
              <StatTile
                icon={<MemoryStick className="h-4 w-4" />}
                label="Memory"
                value={
                  sysLoading || !info
                    ? "—"
                    : `${info.memory.usedGb.toFixed(1)} / ${info.memory.totalGb.toFixed(1)} GB`
                }
                percent={info?.memory.percent}
              />
              <StatTile
                icon={<HardDrive className="h-4 w-4" />}
                label="Disk"
                value={
                  sysLoading || !info
                    ? "—"
                    : `${info.disk.used} / ${info.disk.total}`
                }
                percent={info?.disk.percent}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              {info && (
                <>
                  <span>
                    <span className="text-foreground">Uptime:</span>{" "}
                    {formatUptime(info.uptimeSeconds)}
                  </span>
                  <span>•</span>
                  <span>
                    <span className="text-foreground">OS:</span> {info.os}
                  </span>
                </>
              )}
            </div>

            {/* Top processes */}
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Top processes (by memory)
                </h3>
                {procLoading && (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                )}
              </div>
              <ScrollArea className="min-h-0 flex-1 rounded-md border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10 text-[10px] uppercase tracking-wide text-muted-foreground shadow-sm">
                    <tr className="border-b">
                      <th className="bg-card px-3 py-2 text-left">PID</th>
                      <th className="bg-card px-3 py-2 text-right">CPU %</th>
                      <th className="bg-card px-3 py-2 text-right">Mem %</th>
                      <th className="bg-card px-3 py-2 text-left">Stat</th>
                      <th className="bg-card px-3 py-2 text-left">Command</th>
                      <th className="bg-card px-3 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {procRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-6 text-center text-muted-foreground"
                        >
                          {procLoading ? "Loading…" : "No processes"}
                        </td>
                      </tr>
                    ) : (
                      procRows.map((p) => (
                        <tr
                          key={p.pid}
                          className="border-b last:border-b-0 hover:bg-muted/20"
                        >
                          <td className="px-3 py-1.5 font-mono">{p.pid}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">
                            {p.cpuPercent.toFixed(1)}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums">
                            {p.memoryPercent.toFixed(1)}
                          </td>
                          <td className="px-3 py-1.5">{p.status}</td>
                          <td className="px-3 py-1.5">
                            <code
                              className="block max-w-[24rem] truncate font-mono text-[10px]"
                              title={p.command}
                            >
                              {p.command}
                            </code>
                          </td>
                          <td className="px-3 py-1.5 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-[10px] text-destructive hover:text-destructive"
                              disabled={pendingKill === p.pid}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Send SIGTERM to PID ${p.pid}?`,
                                  )
                                ) {
                                  setPendingKill(p.pid);
                                  killMut.mutate({
                                    pid: p.pid,
                                    action: "terminate",
                                  });
                                }
                              }}
                            >
                              {pendingKill === p.pid ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  <Skull className="mr-1 h-3 w-3" /> kill
                                </>
                              )}
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </ScrollArea>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatTile({
  icon,
  label,
  value,
  percent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  percent?: number;
}) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {icon}
          {label}
        </div>
        {percent !== undefined && (
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {percent.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="text-base font-semibold tabular-nums">{value}</div>
      {percent !== undefined && (
        <Progress
          value={percent}
          className="mt-2 h-1"
          indicatorClassName={pctColor(percent)}
        />
      )}
    </div>
  );
}
