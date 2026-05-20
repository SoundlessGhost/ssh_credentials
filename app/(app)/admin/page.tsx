"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Crown,
  HardDrive,
  KeyRound,
  Loader2,
  ShieldAlert,
  Terminal as TerminalIcon,
  Users as UsersIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import { useMe } from "@/hooks/useAuth";
import { adminApi } from "@/lib/api/admin";

export default function AdminPage() {
  const router = useRouter();
  const { data: me, isLoading: meLoading } = useMe();

  useEffect(() => {
    if (!meLoading && me && !me.is_admin) router.replace("/");
  }, [me, meLoading, router]);

  if (meLoading || !me) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!me.is_admin) return null;

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-card px-3">
        <Link href="/" className="flex items-center gap-2 text-sm font-medium hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
          Back to file manager
        </Link>
        <Separator orientation="vertical" className="mx-2 h-6" />
        <Crown className="h-4 w-4 text-amber-500" />
        <span className="text-sm font-semibold">Admin dashboard</span>
        <span className="ml-auto text-xs text-muted-foreground">{me.email}</span>
      </header>

      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-5xl space-y-6 p-6">
          <StatsGrid />
          <UsersTable currentUserId={me.id} />
          <AuditTable />
        </div>
      </ScrollArea>
    </div>
  );
}

function StatsGrid() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: adminApi.stats,
    refetchInterval: 10_000,
  });

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Platform stats
      </h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard
          icon={<UsersIcon className="h-4 w-4" />}
          label="Users"
          value={data?.total_users}
          loading={isLoading}
          sub={data ? `${data.total_admins} admin` : undefined}
        />
        <StatCard
          icon={<HardDrive className="h-4 w-4" />}
          label="Saved servers"
          value={data?.total_servers}
          loading={isLoading}
        />
        <StatCard
          icon={<KeyRound className="h-4 w-4" />}
          label="Trusted host keys"
          value={data?.total_known_hosts}
          loading={isLoading}
        />
        <StatCard
          icon={<TerminalIcon className="h-4 w-4" />}
          label="Active sessions"
          value={data?.active_sessions}
          loading={isLoading}
        />
        <StatCard
          icon={<ShieldAlert className="h-4 w-4" />}
          label="Audit events 24h"
          value={data?.audit_events_last_24h}
          loading={isLoading}
        />
      </div>
    </section>
  );
}

function StatCard({
  icon,
  label,
  value,
  loading,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number;
  loading: boolean;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-semibold tabular-nums">
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (value ?? 0)}
      </div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function UsersTable({ currentUserId }: { currentUserId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: adminApi.users,
  });
  const toggleAdmin = useMutation({
    mutationFn: ({ id, value }: { id: string; value: boolean }) =>
      adminApi.toggleAdmin(id, value),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Users ({data?.length ?? 0})
      </h2>
      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-xs">
          <thead className="border-b bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-center">Admin</th>
              <th className="px-3 py-2 text-right">Servers</th>
              <th className="px-3 py-2 text-right">Hosts</th>
              <th className="px-3 py-2 text-left">Created</th>
              <th className="px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                  <Loader2 className="inline h-4 w-4 animate-spin" />
                </td>
              </tr>
            ) : (data ?? []).length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                  No users
                </td>
              </tr>
            ) : (
              (data ?? []).map((u) => {
                const isSelf = u.id === currentUserId;
                return (
                  <tr key={u.id} className="border-b last:border-b-0 hover:bg-muted/20">
                    <td className="px-3 py-2">
                      <span className="font-medium">{u.email}</span>
                      {isSelf && (
                        <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[9px]">
                          you
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {u.is_admin ? (
                        <Crown className="inline h-3.5 w-3.5 text-amber-500" />
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{u.server_count}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{u.known_host_count}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {u.created_at.slice(0, 10)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {isSelf ? (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[11px]"
                          disabled={toggleAdmin.isPending}
                          onClick={() => {
                            const next = !u.is_admin;
                            if (
                              !next ||
                              window.confirm(
                                next
                                  ? `Grant admin to ${u.email}?`
                                  : `Revoke admin from ${u.email}?`,
                              )
                            ) {
                              toggleAdmin.mutate(
                                { id: u.id, value: next },
                                {
                                  onSuccess: () =>
                                    toast.success(
                                      next
                                        ? `${u.email} is now admin`
                                        : `${u.email} demoted`,
                                    ),
                                  onError: (e) =>
                                    toast.error(
                                      e instanceof Error ? e.message : "Failed",
                                    ),
                                },
                              );
                            }
                          }}
                        >
                          {u.is_admin ? "Revoke admin" : "Make admin"}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AuditTable() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "audit"],
    queryFn: () => adminApi.audit(50, 0),
    refetchInterval: 15_000,
  });

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Recent audit events (all users)
      </h2>
      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-xs">
          <thead className="border-b bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Time</th>
              <th className="px-3 py-2 text-left">User</th>
              <th className="px-3 py-2 text-left">Action</th>
              <th className="px-3 py-2 text-left">Target</th>
              <th className="px-3 py-2 text-left">IP</th>
              <th className="px-3 py-2 text-left">Detail</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                  <Loader2 className="inline h-4 w-4 animate-spin" />
                </td>
              </tr>
            ) : (data ?? []).length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                  No events
                </td>
              </tr>
            ) : (
              (data ?? []).map((e) => (
                <tr key={e.id} className="border-b last:border-b-0 hover:bg-muted/20">
                  <td className="px-3 py-2 text-muted-foreground">
                    {e.created_at.slice(5, 19).replace("T", " ")}
                  </td>
                  <td className="px-3 py-2">
                    {e.user_email ?? <span className="text-muted-foreground/50">—</span>}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px]">{e.action}</td>
                  <td className="px-3 py-2 truncate text-muted-foreground">{e.target ?? ""}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">
                    {e.ip ?? ""}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{e.detail ?? ""}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
