"use client";

import React, { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

import { ApiError } from "@/lib/api/client";
import {
  useConnectServer,
  useCreateServer,
  useUpdateServer,
} from "@/hooks/useServers";
import { useConnection } from "@/stores/connection";
import { useHostKeyConfirm } from "@/stores/hostKeyConfirm";
import type { HostKeyRequired, SavedServer } from "@/lib/api/servers";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: SavedServer | null;
};

type AuthType = "password" | "key";

export function ConnectionDialog({ open, onOpenChange, editing }: Props) {
  const setSession = useConnection((s) => s.setSession);
  const openHostKeyConfirm = useHostKeyConfirm((s) => s.open);
  const createServer = useCreateServer();
  const updateServer = useUpdateServer();
  const connectServer = useConnectServer();

  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("22");
  const [username, setUsername] = useState("root");
  const [authType, setAuthType] = useState<AuthType>("password");
  const [password, setPassword] = useState("");
  const [privateKey, setPrivateKey] = useState("");

  const submitting =
    createServer.isPending || updateServer.isPending || connectServer.isPending;

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setHost(editing.host);
      setPort(String(editing.port));
      setUsername(editing.username);
      setAuthType(editing.auth_type);
      // Credentials live encrypted on the server — never returned. Leave
      // the inputs blank; user supplies new value only when rotating.
      setPassword("");
      setPrivateKey("");
    } else {
      setName("");
      setHost("");
      setPort("22");
      setUsername("root");
      setAuthType("password");
      setPassword("");
      setPrivateKey("");
    }
  }, [open, editing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!host.trim() || !username.trim()) {
      toast.error("Host and username required");
      return;
    }
    // For new server, credential is mandatory. For edit, optional (rotation).
    if (!editing) {
      if (authType === "password" && !password) {
        toast.error("Password required");
        return;
      }
      if (authType === "key" && !privateKey.trim()) {
        toast.error("Private key required");
        return;
      }
    }

    const displayName = name.trim() || `${username}@${host}`;
    const portNum = parseInt(port, 10) || 22;

    try {
      let serverId: string;
      if (editing) {
        const updated = await updateServer.mutateAsync({
          id: editing.id,
          body: {
            name: displayName,
            host: host.trim(),
            port: portNum,
            username: username.trim(),
            auth_type: authType,
            password: authType === "password" && password ? password : undefined,
            private_key: authType === "key" && privateKey ? privateKey : undefined,
          },
        });
        serverId = updated.id;
      } else {
        const created = await createServer.mutateAsync({
          name: displayName,
          host: host.trim(),
          port: portNum,
          username: username.trim(),
          auth_type: authType,
          password: authType === "password" ? password : undefined,
          private_key: authType === "key" ? privateKey : undefined,
        });
        serverId = created.id;
      }

      const doConnect = async () => {
        const result = await connectServer.mutateAsync(serverId);
        setSession({
          sessionId: result.session_id,
          serverId: result.server_id,
          hostname: result.hostname,
          os: result.os,
          currentDir: result.currentDir,
        });
        toast.success(`Connected to ${displayName}`);
      };

      try {
        await doConnect();
        onOpenChange(false);
      } catch (connectErr) {
        if (connectErr instanceof ApiError && connectErr.status === 428) {
          // Hand off to global TOFU dialog; close this one.
          openHostKeyConfirm({
            challenge: connectErr.body as HostKeyRequired,
            retry: doConnect,
          });
          onOpenChange(false);
        } else {
          throw connectErr;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Operation failed";
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit server" : "Add server"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update fields. Leave password/key blank to keep the existing one."
              : "Credentials are encrypted server-side before storage."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Display name</label>
            <Input
              placeholder="my-prod-vps"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-[1fr_90px] gap-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Host</label>
              <Input
                placeholder="123.45.67.89"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Port</label>
              <Input
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Username</label>
            <Input
              placeholder="root"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Auth method</label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={authType === "password" ? "default" : "outline"}
                onClick={() => setAuthType("password")}
                className="flex-1"
              >
                Password
              </Button>
              <Button
                type="button"
                size="sm"
                variant={authType === "key" ? "default" : "outline"}
                onClick={() => setAuthType("key")}
                className="flex-1"
              >
                Private key
              </Button>
            </div>
          </div>

          {authType === "password" ? (
            <div className="space-y-1.5">
              <label className="text-xs font-medium">
                Password
                {editing && (
                  <span className="ml-1 text-[10px] text-muted-foreground">
                    (leave blank to keep current)
                  </span>
                )}
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-medium">
                Private key (PEM)
                {editing && (
                  <span className="ml-1 text-[10px] text-muted-foreground">
                    (leave blank to keep current)
                  </span>
                )}
              </label>
              <textarea
                className="min-h-[120px] w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
                placeholder="-----BEGIN RSA PRIVATE KEY-----"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
              />
            </div>
          )}

          <Separator />

          <div className="flex items-start gap-2 rounded-md bg-emerald-50 p-2 text-[11px] text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Credentials are Fernet-encrypted server-side. Plaintext never
              touches localStorage and isn't returned by the API.
            </span>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {editing ? "Save & reconnect" : "Connect & save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
