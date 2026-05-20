"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { env } from "@/lib/env";
import { useConnection } from "@/stores/connection";
import { useClipboard } from "@/stores/clipboard";
import { useFileSelection } from "@/stores/fileSelection";
import { useFileDialogs } from "@/stores/fileDialogs";
import type { FileItem } from "@/hooks/useFiles";

function basename(p: string): string {
  return p.replace(/\/+$/, "").split("/").pop() ?? p;
}
function joinPath(dir: string, name: string): string {
  return `${dir.replace(/\/+$/, "")}/${name}`.replace(/\/+/g, "/");
}

export function useFileActions(items: FileItem[]) {
  const sessionId = useConnection((s) => s.sessionId);
  const currentPath = useConnection((s) => s.currentPath);
  const selected = useFileSelection((s) => s.selected);
  const clearSelection = useFileSelection((s) => s.clear);
  const clipboard = useClipboard();
  const dialogs = useFileDialogs();
  const qc = useQueryClient();

  const selectedItems = items.filter((i) => selected.has(i.path));
  const hasSelection = selectedItems.length > 0;
  const isSingle = selectedItems.length === 1;
  const hasClipboard = clipboard.paths.length > 0;

  const invalidate = useCallback(
    (path?: string) => {
      if (!sessionId) return;
      qc.invalidateQueries({
        queryKey: ["files", sessionId, path ?? currentPath],
      });
    },
    [qc, sessionId, currentPath],
  );

  const cut = useCallback(() => {
    if (!hasSelection) return;
    clipboard.set(
      selectedItems.map((i) => i.path),
      "cut",
      currentPath,
    );
    toast.message(`Cut ${selectedItems.length} item(s)`);
  }, [hasSelection, selectedItems, currentPath, clipboard]);

  const copy = useCallback(() => {
    if (!hasSelection) return;
    clipboard.set(
      selectedItems.map((i) => i.path),
      "copy",
      currentPath,
    );
    toast.message(`Copied ${selectedItems.length} item(s)`);
  }, [hasSelection, selectedItems, currentPath, clipboard]);

  const paste = useCallback(async () => {
    if (!sessionId || !hasClipboard || !clipboard.mode) return;
    const endpoint =
      clipboard.mode === "cut" ? endpoints.ssh.move : endpoints.ssh.copy;
    let failures = 0;
    for (const src of clipboard.paths) {
      const dest = joinPath(currentPath, basename(src));
      if (dest === src) {
        failures++;
        continue;
      }
      try {
        await api(endpoint, {
          method: "POST",
          json: {
            session_id: sessionId,
            src_path: src,
            dest_path: dest,
          },
        });
      } catch (err) {
        failures++;
        const msg = err instanceof Error ? err.message : "failed";
        toast.error(`${basename(src)}: ${msg}`);
      }
    }
    invalidate();
    if (clipboard.sourcePath && clipboard.sourcePath !== currentPath) {
      invalidate(clipboard.sourcePath);
    }
    if (clipboard.mode === "cut") clipboard.clear();
    if (failures === 0) {
      toast.success(`Pasted ${clipboard.paths.length} item(s)`);
    }
  }, [sessionId, hasClipboard, clipboard, currentPath, invalidate]);

  const download = useCallback(() => {
    if (!sessionId || !isSingle) return;
    const item = selectedItems[0];
    if (item.type === "folder") {
      toast.error("Compress folder first, then download");
      return;
    }
    const params = new URLSearchParams({
      session_id: sessionId,
      path: item.path,
    });
    const url = `${env.apiUrl}/api/ssh/download?${params.toString()}`;
    // Browser handles streaming + filename via Content-Disposition.
    const a = document.createElement("a");
    a.href = url;
    a.rel = "noopener";
    a.download = item.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [sessionId, isSingle, selectedItems]);

  const triggerRename = useCallback(() => {
    if (!isSingle) return;
    dialogs.openRename(selectedItems[0]);
  }, [isSingle, selectedItems, dialogs]);

  const triggerDelete = useCallback(
    (target?: FileItem[]) => {
      const targets = target ?? selectedItems;
      if (targets.length === 0) return;
      dialogs.openDelete(targets);
    },
    [selectedItems, dialogs],
  );

  const triggerCompress = useCallback(
    (target?: FileItem[]) => {
      const targets = target ?? selectedItems;
      if (targets.length === 0) return;
      dialogs.openCompress(targets);
    },
    [selectedItems, dialogs],
  );

  const performRename = useCallback(
    async (item: FileItem, newName: string) => {
      if (!sessionId) return;
      const trimmed = newName.trim();
      if (!trimmed || trimmed === item.name) return;
      if (trimmed.includes("/")) {
        toast.error("Name cannot contain '/'");
        return;
      }
      const parent = item.path.slice(0, item.path.lastIndexOf("/")) || "/";
      const dest = joinPath(parent, trimmed);
      try {
        await api(endpoints.ssh.move, {
          method: "POST",
          json: {
            session_id: sessionId,
            src_path: item.path,
            dest_path: dest,
          },
        });
        toast.success(`Renamed to ${trimmed}`);
        invalidate();
        clearSelection();
        dialogs.closeRename();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Rename failed";
        toast.error(msg);
      }
    },
    [sessionId, invalidate, clearSelection, dialogs],
  );

  const performDelete = useCallback(
    async (targets: FileItem[]) => {
      if (!sessionId || targets.length === 0) return;
      let ok = 0;
      let failed = 0;
      for (const item of targets) {
        try {
          await api(endpoints.ssh.delete, {
            method: "DELETE",
            query: { session_id: sessionId, path: item.path },
          });
          ok++;
        } catch (err) {
          failed++;
          const msg = err instanceof Error ? err.message : "failed";
          toast.error(`${item.name}: ${msg}`);
        }
      }
      invalidate();
      clearSelection();
      dialogs.closeDelete();
      if (ok > 0 && failed === 0) toast.success(`Deleted ${ok} item(s)`);
      else if (ok > 0) toast.warning(`Deleted ${ok}, ${failed} failed`);
    },
    [sessionId, invalidate, clearSelection, dialogs],
  );

  const performCompress = useCallback(
    async (targets: FileItem[], destName: string) => {
      if (!sessionId || targets.length === 0) return;
      const trimmed = destName.trim();
      if (!trimmed) {
        toast.error("Archive name required");
        return;
      }
      const dest = joinPath(currentPath, trimmed);
      try {
        const res = await api<{ success: boolean; path: string; format: string }>(
          endpoints.ssh.zip,
          {
            method: "POST",
            json: {
              session_id: sessionId,
              paths: targets.map((t) => t.path),
              dest_path: dest,
            },
          },
        );
        toast.success(`Created ${res.path}`);
        invalidate();
        dialogs.closeCompress();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Compress failed";
        toast.error(msg);
      }
    },
    [sessionId, currentPath, invalidate, dialogs],
  );

  const extract = useCallback(
    async (item: FileItem) => {
      if (!sessionId) return;
      try {
        await api(endpoints.ssh.unzip, {
          method: "POST",
          json: {
            session_id: sessionId,
            zip_path: item.path,
            dest_dir: currentPath,
          },
        });
        toast.success(`Extracted ${item.name}`);
        invalidate();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Extract failed";
        toast.error(msg);
      }
    },
    [sessionId, currentPath, invalidate],
  );

  return {
    selectedItems,
    hasSelection,
    isSingle,
    hasClipboard,
    clipboardMode: clipboard.mode,

    cut,
    copy,
    paste,
    download,
    triggerRename,
    triggerDelete,
    triggerCompress,
    performRename,
    performDelete,
    performCompress,
    extract,
  };
}
