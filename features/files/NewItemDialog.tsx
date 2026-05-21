"use client";

import React, { useEffect, useState } from "react";
import { FolderPlus, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useFileDialogs } from "@/stores/fileDialogs";
import { useConnection } from "@/stores/connection";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";

function joinPath(dir: string, name: string): string {
  return `${dir.replace(/\/+$/, "")}/${name}`.replace(/\/+/g, "/");
}

/**
 * Unified "New folder / New file" dialog. Replaces the ad-hoc
 * window.prompt() calls and the per-component dialog that used to live
 * inside ActionRibbon. Both call sites now open this via the
 * `fileDialogs.openNewItem(...)` store action.
 */
export function NewItemDialog() {
  const req = useFileDialogs((s) => s.newItem);
  const close = useFileDialogs((s) => s.closeNewItem);
  const sessionId = useConnection((s) => s.sessionId);
  const currentPath = useConnection((s) => s.currentPath);
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  // Reset name + selection whenever the dialog opens for a new request.
  useEffect(() => {
    if (req) {
      setName(req.defaultName);
      // Pre-select the basename so typing replaces it immediately.
    }
  }, [req]);

  if (!req) return null;

  const isFolder = req.kind === "folder";

  const submit = async () => {
    if (!sessionId) {
      toast.error("Connect to a server first");
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Name required");
      return;
    }
    if (trimmed.includes("/")) {
      toast.error("Name cannot contain '/'");
      return;
    }
    setBusy(true);
    try {
      if (isFolder) {
        await api(endpoints.ssh.createFolder, {
          method: "POST",
          json: {
            session_id: sessionId,
            path: currentPath,
            folder_name: trimmed,
          },
        });
      } else {
        const dest = joinPath(currentPath, trimmed);
        await api(endpoints.ssh.writeFile, {
          method: "POST",
          json: {
            session_id: sessionId,
            path: dest,
            content: req.content,
          },
        });
      }
      toast.success(`Created ${trimmed}`);
      qc.invalidateQueries({ queryKey: ["files", sessionId, currentPath] });
      close();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!req} onOpenChange={(o) => !o && !busy && close()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isFolder ? (
              <FolderPlus className="h-4 w-4 text-primary" />
            ) : (
              <Plus className="h-4 w-4 text-primary" />
            )}
            New {req.label}
          </DialogTitle>
        </DialogHeader>
        <Input
          placeholder={req.defaultName}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          autoFocus
          onFocus={(e) => {
            // Select the basename (everything before the last dot) so the
            // user can just start typing to replace it — Windows parity.
            const v = e.currentTarget.value;
            const dot = v.lastIndexOf(".");
            const end = dot > 0 ? dot : v.length;
            e.currentTarget.setSelectionRange(0, end);
          }}
        />
        <p className="text-[11px] text-muted-foreground">
          Created in <code className="font-mono">{currentPath}</code>
        </p>
        <DialogFooter>
          <Button variant="ghost" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
