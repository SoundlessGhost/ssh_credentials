"use client";

import React, { useState } from "react";
import { Fingerprint, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

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

import { knownHostsApi } from "@/lib/api/knownHosts";
import { useHostKeyConfirm } from "@/stores/hostKeyConfirm";

export function HostKeyConfirmDialog() {
  const pending = useHostKeyConfirm((s) => s.pending);
  const close = useHostKeyConfirm((s) => s.close);
  const [submitting, setSubmitting] = useState(false);

  if (!pending) return null;
  const { challenge, retry } = pending;

  const onConfirm = async () => {
    setSubmitting(true);
    try {
      await knownHostsApi.trust({
        host: challenge.host,
        port: challenge.port,
        key_type: challenge.key_type,
        key_b64: challenge.key_b64,
      });
      close();
      // Retry the original connect now that the key is trusted.
      try {
        await retry();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Reconnect failed";
        toast.error(msg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to trust host key";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AlertDialog
      open={!!pending}
      onOpenChange={(open) => {
        if (!open && !submitting) close();
      }}
    >
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            New host — verify fingerprint
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-xs">
              <div>
                You're connecting to{" "}
                <code className="font-mono">
                  {challenge.host}:{challenge.port}
                </code>{" "}
                for the first time. Confirm this fingerprint matches what
                your VPS owner expects — otherwise an attacker may be
                intercepting your connection.
              </div>
              <div className="rounded-md border bg-muted/40 p-3">
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <Fingerprint className="h-3 w-3" />
                  SHA-256 fingerprint
                </div>
                <div className="break-all font-mono text-xs">
                  {challenge.fingerprint_sha256}
                </div>
                <div className="mt-2 text-[10px] text-muted-foreground">
                  Key type: {challenge.key_type}
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground">
                Verify on your VPS:{" "}
                <code className="font-mono">
                  ssh-keygen -lf /etc/ssh/ssh_host_{challenge.key_type
                    .replace("ssh-", "")
                    .split("-")[0]}_key.pub
                </code>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={submitting}>
            {submitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Trust & connect
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
