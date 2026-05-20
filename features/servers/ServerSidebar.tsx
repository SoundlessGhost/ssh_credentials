"use client";

import React, { useState } from "react";
import {
  Loader2,
  Pencil,
  Plus,
  Power,
  Server,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
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

import { ApiError } from "@/lib/api/client";
import { disconnectSSH } from "@/lib/api/ssh";
import type { HostKeyRequired, SavedServer } from "@/lib/api/servers";
import {
  useConnectServer,
  useDeleteServer,
  useServers,
} from "@/hooks/useServers";
import { useConnection } from "@/stores/connection";
import { useHostKeyConfirm } from "@/stores/hostKeyConfirm";
import { ConnectionDialog } from "@/features/connection/ConnectionDialog";

export function ServerSidebar() {
  const { data: servers = [], isLoading } = useServers();
  const sessionId = useConnection((s) => s.sessionId);
  const activeServerId = useConnection((s) => s.serverId);
  const setSession = useConnection((s) => s.setSession);
  const clearConnection = useConnection((s) => s.clear);

  const connectServer = useConnectServer();
  const deleteServer = useDeleteServer();
  const openHostKeyConfirm = useHostKeyConfirm((s) => s.open);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<SavedServer | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SavedServer | null>(null);

  const openAddDialog = () => {
    setEditingServer(null);
    setDialogOpen(true);
  };

  const openEditDialog = (server: SavedServer) => {
    setEditingServer(server);
    setDialogOpen(true);
  };

  const doConnect = async (server: SavedServer) => {
    if (sessionId && activeServerId !== server.id) {
      try {
        await disconnectSSH(sessionId);
      } catch {
        // ignore
      }
      clearConnection();
    }
    const result = await connectServer.mutateAsync(server.id);
    setSession({
      sessionId: result.session_id,
      serverId: result.server_id,
      hostname: result.hostname,
      os: result.os,
      currentDir: result.currentDir,
    });
    toast.success(`Connected to ${server.name}`);
  };

  const handleConnect = async (server: SavedServer) => {
    if (busyId) return;
    setBusyId(server.id);
    try {
      await doConnect(server);
    } catch (err) {
      if (err instanceof ApiError && err.status === 428) {
        // Surface the TOFU dialog. The "retry" closure preserves which
        // server we were trying to connect to.
        openHostKeyConfirm({
          challenge: err.body as HostKeyRequired,
          retry: () => doConnect(server),
        });
      } else {
        const msg = err instanceof Error ? err.message : "Connection failed";
        toast.error(msg);
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleDisconnect = async () => {
    if (!sessionId) return;
    try {
      await disconnectSSH(sessionId);
    } catch {
      // ignore
    }
    clearConnection();
    toast.message("Disconnected");
  };

  const confirmDelete = (server: SavedServer) => setPendingDelete(server);

  const doDelete = async () => {
    if (!pendingDelete) return;
    if (activeServerId === pendingDelete.id && sessionId) {
      try {
        await disconnectSSH(sessionId);
      } catch {}
      clearConnection();
    }
    try {
      await deleteServer.mutateAsync(pendingDelete.id);
      toast.message(`Removed ${pendingDelete.name}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      toast.error(msg);
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 pt-3">
        <div className="flex items-center justify-between px-1 pb-1">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Quick Access
          </div>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
            Soon
          </span>
        </div>
        <div className="rounded-md bg-muted/40 px-2 py-1.5 text-[11px] leading-snug text-muted-foreground">
          <Star className="mr-1.5 inline h-3 w-3" />
          Pin remote folders here for one-click access. Lands Phase 4.5.
        </div>
      </div>

      <Separator className="my-3" />

      <div className="flex items-center justify-between px-3 pb-1.5">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Saved Servers
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={openAddDialog}
          aria-label="Add server"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-2 pb-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
            <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> Loading
          </div>
        ) : servers.length === 0 ? (
          <div className="px-2 py-6 text-center text-xs text-muted-foreground">
            No servers yet.
            <br />
            <Button
              variant="link"
              className="h-auto p-0 text-xs"
              onClick={openAddDialog}
            >
              + Add your first server
            </Button>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {servers.map((server) => {
              const isActive = activeServerId === server.id;
              const isConnected = isActive && !!sessionId;
              const isBusy = busyId === server.id;
              return (
                <li key={server.id}>
                  <ContextMenu>
                    <ContextMenuTrigger asChild>
                      <button
                        type="button"
                        onClick={() => handleConnect(server)}
                        disabled={isBusy}
                        className={`group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-sidebar-accent ${
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : ""
                        }`}
                      >
                        <span className="relative inline-flex h-2 w-2 shrink-0 items-center justify-center">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              isConnected
                                ? "bg-emerald-500"
                                : "bg-muted-foreground/40"
                            }`}
                          />
                          {isConnected && (
                            <span className="absolute h-2 w-2 animate-ping rounded-full bg-emerald-500/40" />
                          )}
                        </span>
                        <Server className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-xs font-medium leading-tight">
                            {server.name}
                          </span>
                          <span className="truncate text-[10px] text-muted-foreground">
                            {server.username}@{server.host}:{server.port}
                          </span>
                        </span>
                        {isBusy && (
                          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        )}
                      </button>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-44">
                      {!isConnected && (
                        <ContextMenuItem onSelect={() => handleConnect(server)}>
                          <Power className="mr-2 h-3.5 w-3.5" /> Connect
                        </ContextMenuItem>
                      )}
                      {isConnected && (
                        <ContextMenuItem onSelect={handleDisconnect}>
                          <Power className="mr-2 h-3.5 w-3.5" /> Disconnect
                        </ContextMenuItem>
                      )}
                      <ContextMenuItem onSelect={() => openEditDialog(server)}>
                        <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        onSelect={() => confirmDelete(server)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>

      {sessionId && (
        <>
          <Separator />
          <div className="p-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={handleDisconnect}
            >
              <Power className="mr-1.5 h-3.5 w-3.5" /> Disconnect
            </Button>
          </div>
        </>
      )}

      <ConnectionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editingServer}
      />

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete server?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.name} will be removed from your vault. The
              remote VPS is not touched.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
