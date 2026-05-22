"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ArrowLeft,
  Copy,
  Crown,
  Download,
  HardDrive,
  KeyRound,
  Loader2,
  PowerOff,
  RefreshCw,
  ShieldAlert,
  Terminal as TerminalIcon,
  Trash2,
  Users as UsersIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useMe } from "@/hooks/useAuth";
import { adminApi, type AdminUser } from "@/lib/api/admin";
import { env } from "@/lib/env";

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
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-medium hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to file manager
        </Link>
        <Separator orientation="vertical" className="mx-2 h-6" />
        <Crown className="h-4 w-4 text-amber-500" />
        <span className="text-sm font-semibold">Admin dashboard</span>
        <span className="ml-auto text-xs text-muted-foreground">{me.email}</span>
      </header>

      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-6xl space-y-4 p-6">
          <StatsGrid />

          <Tabs defaultValue="users" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
              <TabsTrigger value="audit">Audit Log</TabsTrigger>
            </TabsList>
            <TabsContent value="users" className="pt-3">
              <UsersTable currentUserId={me.id} />
            </TabsContent>
            <TabsContent value="sessions" className="pt-3">
              <SessionsTable />
            </TabsContent>
            <TabsContent value="audit" className="pt-3">
              <AuditTable />
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}

// =====================================================================
//  Platform stats
// =====================================================================

function StatsGrid() {
  const qc = useQueryClient();
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: adminApi.stats,
    refetchInterval: 10_000,
  });

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Platform stats
        </h2>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1.5 px-2 text-xs"
          onClick={() => qc.invalidateQueries({ queryKey: ["admin"] })}
        >
          {isFetching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Refresh
        </Button>
      </div>
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
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          (value ?? 0)
        )}
      </div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

// =====================================================================
//  Users
// =====================================================================

function UsersTable({ currentUserId }: { currentUserId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: adminApi.users,
  });

  const [filter, setFilter] = useState("");
  const filtered = useMemo(() => {
    if (!data) return [];
    const q = filter.toLowerCase().trim();
    if (!q) return data;
    return data.filter((u) => u.email.toLowerCase().includes(q));
  }, [data, filter]);

  const toggleAdmin = useMutation({
    mutationFn: ({ id, value }: { id: string; value: boolean }) =>
      adminApi.toggleAdmin(id, value),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });
  const deleteUser = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });
  const disconnectUser = useMutation({
    mutationFn: (id: string) => adminApi.disconnectUser(id),
    onSuccess: (res) => {
      toast.success(`Killed ${res.killed} session(s)`);
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
  });
  const resetPassword = useMutation({
    mutationFn: (id: string) => adminApi.resetPassword(id),
  });

  const [pendingDelete, setPendingDelete] = useState<AdminUser | null>(null);
  const [tempPassword, setTempPassword] = useState<{
    email: string;
    pw: string;
  } | null>(null);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Users ({filtered.length}/{data?.length ?? 0})
        </h2>
        <Input
          placeholder="Filter by email…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-7 w-64 text-xs"
        />
      </div>
      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-xs">
          <thead className="border-b bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-center">Admin</th>
              <th className="px-3 py-2 text-right">Servers</th>
              <th className="px-3 py-2 text-right">Hosts</th>
              <th className="px-3 py-2 text-left">Created</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                  <Loader2 className="inline h-4 w-4 animate-spin" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                  No users
                </td>
              </tr>
            ) : (
              filtered.map((u) => {
                const isSelf = u.id === currentUserId;
                return (
                  <tr
                    key={u.id}
                    className="border-b last:border-b-0 hover:bg-muted/20"
                  >
                    <td className="px-3 py-2">
                      <span className="font-medium">{u.email}</span>
                      {isSelf && (
                        <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[9px]">
                          you
                        </Badge>
                      )}
                      {!u.email_verified_at && (
                        <Badge
                          variant="outline"
                          className="ml-1 h-4 border-amber-500/40 px-1 text-[9px] text-amber-500"
                        >
                          unverified
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
                    <td className="px-3 py-2 text-right tabular-nums">
                      {u.server_count}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {u.known_host_count}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {u.created_at.slice(0, 10)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        {!isSelf && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[10px]"
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
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[10px]"
                          title="Force-disconnect SSH sessions"
                          disabled={disconnectUser.isPending}
                          onClick={() => disconnectUser.mutate(u.id)}
                        >
                          <PowerOff className="h-3 w-3" />
                        </Button>
                        {!isSelf && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[10px]"
                            title="Reset password"
                            disabled={resetPassword.isPending}
                            onClick={() => {
                              if (
                                !window.confirm(
                                  `Reset password for ${u.email}? They will be signed out.`,
                                )
                              )
                                return;
                              resetPassword.mutate(u.id, {
                                onSuccess: (res) =>
                                  setTempPassword({
                                    email: u.email,
                                    pw: res.temp_password,
                                  }),
                                onError: (e) =>
                                  toast.error(
                                    e instanceof Error ? e.message : "Failed",
                                  ),
                              });
                            }}
                          >
                            <KeyRound className="h-3 w-3" />
                          </Button>
                        )}
                        {!isSelf && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[10px] text-destructive hover:text-destructive"
                            title="Delete user"
                            onClick={() => setPendingDelete(u)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this user?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.email} and every saved server, known host,
              refresh token, and live SSH session belonging to them will
              be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingDelete) return;
                deleteUser.mutate(pendingDelete.id, {
                  onSuccess: () => {
                    toast.success(`Deleted ${pendingDelete.email}`);
                    setPendingDelete(null);
                  },
                  onError: (e) =>
                    toast.error(e instanceof Error ? e.message : "Failed"),
                });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!tempPassword}
        onOpenChange={(o) => !o && setTempPassword(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Temporary password</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Hand this to <b>{tempPassword?.email}</b>. It is shown only
            once and the user has been signed out of every device.
          </p>
          <code className="block break-all rounded bg-muted px-2 py-2 font-mono text-sm">
            {tempPassword?.pw}
          </code>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={async () => {
                if (!tempPassword) return;
                try {
                  await navigator.clipboard.writeText(tempPassword.pw);
                  toast.success("Password copied");
                } catch {
                  toast.error("Clipboard blocked");
                }
              }}
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
            </Button>
            <Button onClick={() => setTempPassword(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

// =====================================================================
//  Sessions
// =====================================================================

function SessionsTable() {
  const qc = useQueryClient();
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin", "sessions"],
    queryFn: adminApi.sessions,
    refetchInterval: 10_000,
  });
  const kill = useMutation({
    mutationFn: (sid: string) => adminApi.killSession(sid),
    onSuccess: () => {
      toast.success("Session killed");
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
  });

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Active SSH sessions ({data?.length ?? 0})
        </h2>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1.5 px-2 text-xs"
          onClick={() =>
            qc.invalidateQueries({ queryKey: ["admin", "sessions"] })
          }
        >
          {isFetching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Refresh
        </Button>
      </div>
      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-xs">
          <thead className="border-b bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Session ID</th>
              <th className="px-3 py-2 text-left">User</th>
              <th className="px-3 py-2 text-left">Remote host</th>
              <th className="px-3 py-2 text-left">Connected at</th>
              <th className="px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                  <Loader2 className="inline h-4 w-4 animate-spin" />
                </td>
              </tr>
            ) : (data ?? []).length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                  No active SSH sessions
                </td>
              </tr>
            ) : (
              (data ?? []).map((s) => (
                <tr key={s.session_id} className="border-b last:border-b-0 hover:bg-muted/20">
                  <td className="px-3 py-2 font-mono text-[10px]">
                    {s.session_id.slice(0, 12)}…
                  </td>
                  <td className="px-3 py-2">
                    {s.user_email ?? (
                      <span className="text-muted-foreground">unknown</span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">
                    {s.hostname ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {s.created_at
                      ? s.created_at.replace("T", " ").slice(0, 19)
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[10px] text-destructive hover:text-destructive"
                      disabled={kill.isPending}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Force-disconnect this session?`,
                          )
                        )
                          kill.mutate(s.session_id);
                      }}
                    >
                      <PowerOff className="mr-1 h-3 w-3" /> Disconnect
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// =====================================================================
//  Audit
// =====================================================================

function AuditTable() {
  const qc = useQueryClient();
  const [filterAction, setFilterAction] = useState("");
  const [filterUser, setFilterUser] = useState("");

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      "admin",
      "audit",
      { action: filterAction, user_email: filterUser },
    ],
    queryFn: () =>
      adminApi.audit({
        limit: 100,
        action: filterAction || undefined,
        user_email: filterUser || undefined,
      }),
    refetchInterval: 15_000,
  });

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Audit events ({data?.length ?? 0})
        </h2>
        <div className="flex items-center gap-1.5">
          <Input
            placeholder="Filter action (e.g. file.delete)"
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="h-7 w-56 text-xs"
          />
          <Input
            placeholder="Filter user email"
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="h-7 w-56 text-xs"
          />
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1.5 px-2 text-xs"
            onClick={() =>
              qc.invalidateQueries({ queryKey: ["admin", "audit"] })
            }
          >
            {isFetching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </Button>
          <a
            href={`${env.apiUrl}/api/admin/audit/export.csv`}
            target="_blank"
            rel="noopener"
            className="inline-flex h-7 items-center gap-1.5 rounded-md border bg-card px-2 text-xs hover:bg-accent"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </a>
        </div>
      </div>
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
                <tr
                  key={e.id}
                  className="border-b last:border-b-0 hover:bg-muted/20"
                >
                  <td className="px-3 py-2 text-muted-foreground">
                    {e.created_at.slice(5, 19).replace("T", " ")}
                  </td>
                  <td className="px-3 py-2">
                    {e.user_email ?? <span className="text-muted-foreground/50">—</span>}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px]">{e.action}</td>
                  <td className="px-3 py-2 truncate text-muted-foreground">
                    {e.target ?? ""}
                  </td>
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
