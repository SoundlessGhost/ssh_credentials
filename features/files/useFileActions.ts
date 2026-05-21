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
import { useQuickAccess } from "@/stores/quickAccess";
import { useTerminalCommand } from "@/stores/terminalCommand";
import { useTerminalUi } from "@/stores/terminalUi";
import { startCompress } from "@/features/files/compressManager";
import type { FileItem } from "@/hooks/useFiles";

export type CompressFormat = "zip" | "tar.gz" | "7z";

function basename(p: string): string {
  return p.replace(/\/+$/, "").split("/").pop() ?? p;
}
function joinPath(dir: string, name: string): string {
  return `${dir.replace(/\/+$/, "")}/${name}`.replace(/\/+/g, "/");
}

/** Split "file.tar.gz" -> ["file", ".tar.gz"]; "noext" -> ["noext", ""]. */
function splitNameExt(name: string): [string, string] {
  const knownDouble = [".tar.gz", ".tar.bz2", ".tar.xz"];
  const lower = name.toLowerCase();
  for (const d of knownDouble) {
    if (lower.endsWith(d)) {
      return [name.slice(0, -d.length), name.slice(-d.length)];
    }
  }
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return [name, ""];
  return [name.slice(0, dot), name.slice(dot)];
}

/** "foo.txt" + existing ["foo.txt"] -> "foo - Copy.txt".
 * Cascades to " - Copy (2).txt" if collision continues. */
function uniqueCopyName(name: string, existing: Set<string>): string {
  const [base, ext] = splitNameExt(name);
  let candidate = `${base} - Copy${ext}`;
  if (!existing.has(candidate)) return candidate;
  for (let i = 2; i < 1000; i++) {
    candidate = `${base} - Copy (${i})${ext}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${base} - Copy ${Date.now()}${ext}`;
}

export function useFileActions(items: FileItem[]) {
  const sessionId = useConnection((s) => s.sessionId);
  const currentPath = useConnection((s) => s.currentPath);
  const serverId = useConnection((s) => s.serverId);
  const selected = useFileSelection((s) => s.selected);
  const clearSelection = useFileSelection((s) => s.clear);
  const clipboard = useClipboard();
  const dialogs = useFileDialogs();
  const qc = useQueryClient();
  const quickAccess = useQuickAccess();
  const enqueueTerminal = useTerminalCommand((s) => s.enqueue);
  const setTerminalOpen = useTerminalUi((s) => s.setOpen);

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

    // Pasting a copy in the source dir = Windows-style " - Copy" rename.
    // Track names we've already allocated this round so two collisions get
    // distinct " - Copy (2)", " - Copy (3)" suffixes.
    const sameDir = clipboard.sourcePath === currentPath;
    const existingNames = new Set(items.map((i) => i.name));

    let failures = 0;
    let renamed = 0;
    for (const src of clipboard.paths) {
      let destName = basename(src);
      if (clipboard.mode === "copy" && sameDir) {
        destName = uniqueCopyName(destName, existingNames);
        existingNames.add(destName);
        renamed++;
      }
      const dest = joinPath(currentPath, destName);
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
      const suffix = renamed > 0 ? " ( - Copy suffix added)" : "";
      toast.success(`Pasted ${clipboard.paths.length} item(s)${suffix}`);
    }
  }, [sessionId, hasClipboard, clipboard, currentPath, invalidate, items]);

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
        await startCompress({
          sessionId,
          paths: targets.map((t) => t.path),
          destPath: dest,
          destName: trimmed,
          qc,
          invalidatePath: currentPath,
        });
        toast.message(`Compressing ${trimmed}…`);
        dialogs.closeCompress();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Compress failed";
        toast.error(msg);
      }
    },
    [sessionId, currentPath, qc, dialogs],
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

  // ===== Windows-style extras =====

  /** Copy item path(s) to clipboard. Ctrl+Shift+C in Windows Explorer. */
  const copyPath = useCallback(async () => {
    if (!hasSelection) return;
    const text = selectedItems.map((i) => i.path).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success(
        isSingle ? "Path copied" : `Copied ${selectedItems.length} paths`,
      );
    } catch {
      toast.error("Clipboard blocked by browser");
    }
  }, [hasSelection, isSingle, selectedItems]);

  /** Compress with a specific archive format (no dialog, default name). */
  const compressTo = useCallback(
    async (targets: FileItem[], format: CompressFormat) => {
      if (!sessionId || targets.length === 0) return;
      const baseName =
        targets.length === 1 ? targets[0].name : "archive";
      const ext = format === "tar.gz" ? "tar.gz" : format;
      const destName = `${baseName}.${ext}`;
      const dest = joinPath(currentPath, destName);
      try {
        await startCompress({
          sessionId,
          paths: targets.map((t) => t.path),
          destPath: dest,
          destName,
          qc,
          invalidatePath: currentPath,
        });
        toast.message(`Compressing ${destName}…`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Compress failed";
        toast.error(msg);
      }
    },
    [sessionId, currentPath, qc],
  );

  /** Queue `cd <path>` into the terminal; caller is responsible for
   * opening the terminal panel (FileContextMenu wires both). */
  const openInTerminal = useCallback(
    (item: FileItem) => {
      if (item.type !== "folder") return;
      enqueueTerminal(`cd ${quoteShellArg(item.path)}\n`);
      setTerminalOpen(true);
      toast.message(`Switched terminal to ${item.path}`);
    },
    [enqueueTerminal, setTerminalOpen],
  );

  /** Pin / unpin folder for the sidebar Quick Access section. */
  const togglePin = useCallback(
    (item: FileItem) => {
      if (item.type !== "folder") return;
      if (quickAccess.isPinned(serverId, item.path)) {
        quickAccess.unpin(serverId, item.path);
        toast.message(`Unpinned ${item.name}`);
      } else {
        quickAccess.pin({
          serverId,
          path: item.path,
          name: item.name,
          pinnedAt: Date.now(),
        });
        toast.success(`Pinned ${item.name}`);
      }
    },
    [quickAccess, serverId],
  );

  const isPinned = useCallback(
    (path: string) => quickAccess.isPinned(serverId, path),
    [quickAccess, serverId],
  );

  /** Open Properties dialog for a single item. */
  const triggerProperties = useCallback(
    (item?: FileItem) => {
      const target = item ?? (isSingle ? selectedItems[0] : null);
      if (!target) return;
      dialogs.openProperties(target);
    },
    [isSingle, selectedItems, dialogs],
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
    triggerProperties,
    performRename,
    performDelete,
    performCompress,
    extract,
    copyPath,
    compressTo,
    openInTerminal,
    togglePin,
    isPinned,
  };
}

function quoteShellArg(s: string): string {
  // POSIX-safe single-quote wrap, embedded single quotes escaped.
  return `'${s.replace(/'/g, `'\\''`)}'`;
}
