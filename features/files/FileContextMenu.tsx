"use client";

import React from "react";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  ArrowUpDown,
  Archive,
  ArchiveRestore,
  ClipboardCopy,
  ClipboardPaste,
  Code2,
  Copy,
  Download,
  Eye,
  FileCode,
  FilePlus,
  FileText,
  FolderOpen,
  FolderPlus,
  Group,
  Info,
  LayoutGrid,
  LayoutList,
  Link as LinkIcon,
  List as ListIcon,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Plus,
  RefreshCw,
  Rows3,
  Scissors,
  Sparkles,
  Squircle,
  Terminal as TerminalIcon,
  Trash2,
  Type,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

import type { FileItem } from "@/hooks/useFiles";
import { useFileActions } from "@/features/files/useFileActions";
import { useConnection } from "@/stores/connection";
import { useUiFilters, type ViewMode } from "@/stores/uiFilters";
import { useTerminalCommand } from "@/stores/terminalCommand";
import { useFileDialogs } from "@/stores/fileDialogs";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { useQueryClient } from "@tanstack/react-query";

const ARCHIVE_EXTS = [".zip", ".tar.gz", ".tgz", ".tar", ".gz", ".rar", ".7z"];
function isArchive(name: string): boolean {
  const lower = name.toLowerCase();
  return ARCHIVE_EXTS.some((ext) => lower.endsWith(ext));
}

type Props = {
  items: FileItem[];
  rowItem: FileItem;
  onOpen: (item: FileItem) => void;
  onUploadClick?: () => void;
  onRefresh?: () => void;
  onOpenTerminal?: () => void;
  children: React.ReactNode;
};

/**
 * Per-row right-click menu. Modeled on Windows Explorer's file context
 * menu, trimmed to what makes sense on a Linux remote.
 */
export function FileContextMenu({
  items,
  rowItem,
  onOpen,
  onUploadClick,
  onRefresh,
  onOpenTerminal,
  children,
}: Props) {
  const navigate = useConnection((s) => s.navigate);
  const actions = useFileActions(items);

  const single = actions.selectedItems.length === 1;
  const multi = actions.selectedItems.length > 1;
  const isFolder = rowItem.type === "folder";
  const isArchiveFile = !isFolder && isArchive(rowItem.name);
  const pinned = isFolder && actions.isPinned(rowItem.path);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-60">
        {/* ===== Open ===== */}
        {single && (
          <ContextMenuItem onSelect={() => onOpen(rowItem)}>
            <FolderOpen className="mr-2 h-3.5 w-3.5" />
            Open
            <ContextMenuShortcut>Enter</ContextMenuShortcut>
          </ContextMenuItem>
        )}
        {isFolder && single && (
          <ContextMenuItem onSelect={() => navigate(rowItem.path)}>
            <FolderOpen className="mr-2 h-3.5 w-3.5" /> Open in new pane
          </ContextMenuItem>
        )}
        {isFolder && single && (
          <ContextMenuItem
            onSelect={() => {
              actions.openInTerminal(rowItem);
              onOpenTerminal?.();
            }}
          >
            <TerminalIcon className="mr-2 h-3.5 w-3.5" /> Open in Terminal
          </ContextMenuItem>
        )}
        {isFolder && single && (
          <ContextMenuItem onSelect={() => actions.togglePin(rowItem)}>
            {pinned ? (
              <>
                <PinOff className="mr-2 h-3.5 w-3.5" /> Unpin from Quick Access
              </>
            ) : (
              <>
                <Pin className="mr-2 h-3.5 w-3.5" /> Pin to Quick Access
              </>
            )}
          </ContextMenuItem>
        )}

        {single && !isFolder && (
          <ContextMenuItem onSelect={actions.download}>
            <Download className="mr-2 h-3.5 w-3.5" /> Download
          </ContextMenuItem>
        )}

        <ContextMenuSeparator />

        {/* ===== Cut / Copy / Paste / Copy path ===== */}
        <ContextMenuItem onSelect={actions.cut}>
          <Scissors className="mr-2 h-3.5 w-3.5" /> Cut
          <ContextMenuShortcut>Ctrl+X</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onSelect={actions.copy}>
          <Copy className="mr-2 h-3.5 w-3.5" /> Copy
          <ContextMenuShortcut>Ctrl+C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={actions.paste}
          disabled={!actions.hasClipboard}
        >
          <ClipboardPaste className="mr-2 h-3.5 w-3.5" /> Paste
          {actions.hasClipboard ? (
            <span className="ml-auto text-[10px] text-muted-foreground">
              {actions.clipboardMode}
            </span>
          ) : (
            <ContextMenuShortcut>Ctrl+V</ContextMenuShortcut>
          )}
        </ContextMenuItem>
        <ContextMenuItem onSelect={actions.copyPath}>
          <ClipboardCopy className="mr-2 h-3.5 w-3.5" /> Copy path
          <ContextMenuShortcut>Ctrl+Shift+C</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* ===== Rename ===== */}
        {single && (
          <ContextMenuItem onSelect={actions.triggerRename}>
            <Pencil className="mr-2 h-3.5 w-3.5" /> Rename
            <ContextMenuShortcut>F2</ContextMenuShortcut>
          </ContextMenuItem>
        )}

        {/* ===== Compress submenu (Windows-style "Compress to →") ===== */}
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Archive className="mr-2 h-3.5 w-3.5" /> Compress to
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-44">
            <ContextMenuItem
              onSelect={() =>
                actions.compressTo(actions.selectedItems, "zip")
              }
            >
              ZIP file
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={() =>
                actions.compressTo(actions.selectedItems, "tar.gz")
              }
            >
              TAR.GZ file
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={() =>
                actions.compressTo(actions.selectedItems, "7z")
              }
            >
              7Z file (if 7z installed)
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={() => actions.triggerCompress()}>
              <Sparkles className="mr-2 h-3.5 w-3.5" /> Custom name…
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        {isArchiveFile && single && (
          <ContextMenuItem onSelect={() => actions.extract(rowItem)}>
            <ArchiveRestore className="mr-2 h-3.5 w-3.5" /> Extract here
          </ContextMenuItem>
        )}

        <ContextMenuSeparator />

        {/* ===== Delete ===== */}
        <ContextMenuItem
          onSelect={() => actions.triggerDelete()}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
          {multi ? (
            <span className="ml-auto text-[10px]">
              {actions.selectedItems.length}
            </span>
          ) : (
            <ContextMenuShortcut>Del</ContextMenuShortcut>
          )}
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* ===== Properties / Upload / Refresh ===== */}
        {single && (
          <ContextMenuItem onSelect={() => actions.triggerProperties(rowItem)}>
            <Info className="mr-2 h-3.5 w-3.5" /> Properties
            <ContextMenuShortcut>Alt+Enter</ContextMenuShortcut>
          </ContextMenuItem>
        )}
        <ContextMenuItem onSelect={onUploadClick}>
          <Upload className="mr-2 h-3.5 w-3.5" /> Upload here
        </ContextMenuItem>
        <ContextMenuItem onSelect={onRefresh}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" /> Refresh
          <ContextMenuShortcut>F5</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

// =====================================================================
//  Empty-area context menu — Windows Explorer parity
// =====================================================================

const VIEW_MODES: { mode: ViewMode; label: string }[] = [
  { mode: "large-icons", label: "Extra large icons" },
  { mode: "medium-icons", label: "Large icons" },
  { mode: "small-icons", label: "Medium icons" },
  { mode: "list", label: "Small icons" },
  { mode: "details", label: "Details" },
];

/**
 * Empty-area context menu (right-click outside any row).
 * Mirrors the Windows 11 desktop / Explorer empty-area menu:
 *   View › Sort by › Group by › Refresh › New › Open in Terminal › Properties
 */
export function EmptyAreaContextMenu({
  items,
  onUploadClick,
  onRefresh,
  onNewFolder,
  onOpenTerminal,
  children,
}: {
  items: FileItem[];
  onUploadClick?: () => void;
  onRefresh?: () => void;
  onNewFolder?: () => void;
  onOpenTerminal?: () => void;
  children: React.ReactNode;
}) {
  const actions = useFileActions(items);
  const sessionId = useConnection((s) => s.sessionId);
  const currentPath = useConnection((s) => s.currentPath);
  const serverHostname = useConnection((s) => s.hostname);
  const viewMode = useUiFilters((s) => s.viewMode);
  const setViewMode = useUiFilters((s) => s.setViewMode);
  const sortKey = useUiFilters((s) => s.sortKey);
  const sortDir = useUiFilters((s) => s.sortDir);
  const setSortKey = useUiFilters((s) => s.setSortKey);
  const setSortDir = useUiFilters((s) => s.setSortDir);
  const groupBy = useUiFilters((s) => s.groupBy);
  const setGroupBy = useUiFilters((s) => s.setGroupBy);
  const enqueueTerminal = useTerminalCommand((s) => s.enqueue);
  const openProperties = useFileDialogs((s) => s.openProperties);
  const qc = useQueryClient();

  const openWithCode = () => {
    if (!sessionId) return;
    enqueueTerminal(`code ${quoteShell(currentPath)}\n`);
    onOpenTerminal?.();
    toast.message(`Sent: code ${currentPath}`);
  };

  const propertiesOfFolder = () => {
    const name =
      currentPath === "/" ? serverHostname ?? "/" : basename(currentPath);
    openProperties({
      name: name || "/",
      type: "folder",
      path: currentPath,
      size: 0,
      sizeStr: "—",
      modified: "—",
      permissions: "—",
    });
  };

  const newTextFile = async () => {
    if (!sessionId) return;
    const fname = window.prompt(
      "New text document — file name (without path):",
      "New Text Document.txt",
    );
    if (!fname) return;
    const trimmed = fname.trim();
    if (!trimmed || trimmed.includes("/")) {
      toast.error("Invalid name");
      return;
    }
    const dest = joinPath(currentPath, trimmed);
    try {
      await api(endpoints.ssh.writeFile, {
        method: "POST",
        json: { session_id: sessionId, path: dest, content: "" },
      });
      toast.success(`Created ${trimmed}`);
      qc.invalidateQueries({ queryKey: ["files", sessionId, currentPath] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed");
    }
  };

  const newShortcut = async () => {
    if (!sessionId) return;
    const target = window.prompt(
      "Symlink target — absolute path on the VPS:",
      "/",
    );
    if (!target) return;
    const linkName = window.prompt(
      "Symlink name (in current folder):",
      basename(target.trim()) + " - Shortcut",
    );
    if (!linkName) return;
    const trimmed = linkName.trim();
    if (!trimmed || trimmed.includes("/")) {
      toast.error("Invalid name");
      return;
    }
    const linkPath = joinPath(currentPath, trimmed);
    const cmd = `ln -s ${quoteShell(target.trim())} ${quoteShell(linkPath)}`;
    try {
      await api(endpoints.ssh.execute, {
        method: "POST",
        json: { session_id: sessionId, command: cmd },
      });
      toast.success(`Created shortcut ${trimmed}`);
      qc.invalidateQueries({ queryKey: ["files", sessionId, currentPath] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Shortcut failed");
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-60">
        {/* ===== View ===== */}
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Eye className="mr-2 h-3.5 w-3.5" /> View
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            {VIEW_MODES.map((v) => (
              <ContextMenuCheckboxItem
                key={v.mode}
                checked={viewMode === v.mode}
                onSelect={(e) => {
                  e.preventDefault();
                  setViewMode(v.mode);
                }}
              >
                {viewIconFor(v.mode)}
                {v.label}
              </ContextMenuCheckboxItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>

        {/* ===== Sort by ===== */}
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <ArrowUpDown className="mr-2 h-3.5 w-3.5" /> Sort by
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-44">
            <ContextMenuRadioGroup
              value={sortKey}
              onValueChange={(v) => setSortKey(v as typeof sortKey)}
            >
              <ContextMenuRadioItem value="name">Name</ContextMenuRadioItem>
              <ContextMenuRadioItem value="size">Size</ContextMenuRadioItem>
              <ContextMenuRadioItem value="type">
                Item type
              </ContextMenuRadioItem>
              <ContextMenuRadioItem value="modified">
                Date modified
              </ContextMenuRadioItem>
            </ContextMenuRadioGroup>
            <ContextMenuSeparator />
            <ContextMenuRadioGroup
              value={sortDir}
              onValueChange={(v) => setSortDir(v as typeof sortDir)}
            >
              <ContextMenuRadioItem value="asc">
                <ArrowUpAZ className="mr-2 h-3.5 w-3.5" /> Ascending
              </ContextMenuRadioItem>
              <ContextMenuRadioItem value="desc">
                <ArrowDownAZ className="mr-2 h-3.5 w-3.5" /> Descending
              </ContextMenuRadioItem>
            </ContextMenuRadioGroup>
          </ContextMenuSubContent>
        </ContextMenuSub>

        {/* ===== Group by ===== */}
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Group className="mr-2 h-3.5 w-3.5" /> Group by
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-44">
            <ContextMenuRadioGroup
              value={groupBy}
              onValueChange={(v) => setGroupBy(v as typeof groupBy)}
            >
              <ContextMenuRadioItem value="none">
                (None)
              </ContextMenuRadioItem>
              <ContextMenuRadioItem value="type">
                Item type
              </ContextMenuRadioItem>
              <ContextMenuRadioItem value="size">Size</ContextMenuRadioItem>
              <ContextMenuRadioItem value="modified">
                Date modified
              </ContextMenuRadioItem>
            </ContextMenuRadioGroup>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSeparator />

        <ContextMenuItem onSelect={onRefresh}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" /> Refresh
          <ContextMenuShortcut>F5</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuItem
          onSelect={actions.paste}
          disabled={!actions.hasClipboard}
        >
          <ClipboardPaste className="mr-2 h-3.5 w-3.5" /> Paste
          {actions.hasClipboard ? (
            <span className="ml-auto text-[10px] text-muted-foreground">
              {actions.clipboardMode}
            </span>
          ) : (
            <ContextMenuShortcut>Ctrl+V</ContextMenuShortcut>
          )}
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* ===== New ===== */}
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Plus className="mr-2 h-3.5 w-3.5" /> New
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-56">
            <ContextMenuItem onSelect={onNewFolder}>
              <FolderPlus className="mr-2 h-3.5 w-3.5" /> Folder
            </ContextMenuItem>
            <ContextMenuItem onSelect={newShortcut}>
              <LinkIcon className="mr-2 h-3.5 w-3.5" /> Shortcut (symlink)
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              onSelect={() => newFileWith(sessionId, currentPath, qc, "Untitled.txt", "")}
            >
              <FileText className="mr-2 h-3.5 w-3.5" /> Text Document
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={() => newFileWith(sessionId, currentPath, qc, "Untitled.md", "")}
            >
              <FileText className="mr-2 h-3.5 w-3.5" /> Markdown Document
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={() =>
                newFileWith(
                  sessionId,
                  currentPath,
                  qc,
                  "script.sh",
                  "#!/usr/bin/env bash\n",
                )
              }
            >
              <FileCode className="mr-2 h-3.5 w-3.5" /> Shell script (.sh)
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={() => newFileWith(sessionId, currentPath, qc, "Untitled.py", "")}
            >
              <FileText className="mr-2 h-3.5 w-3.5" /> Python file (.py)
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={() => newFileWith(sessionId, currentPath, qc, "Untitled.json", "{}\n")}
            >
              <FileText className="mr-2 h-3.5 w-3.5" /> JSON file
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={() => newFileWith(sessionId, currentPath, qc, ".env", "")}
            >
              <FileText className="mr-2 h-3.5 w-3.5" /> .env file
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={newTextFile}>
              <FilePlus className="mr-2 h-3.5 w-3.5" /> Custom file…
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuItem onSelect={onUploadClick}>
          <Upload className="mr-2 h-3.5 w-3.5" /> Upload
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem onSelect={onOpenTerminal}>
          <TerminalIcon className="mr-2 h-3.5 w-3.5" /> Open in Terminal
          <ContextMenuShortcut>Ctrl+`</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onSelect={openWithCode} disabled={!sessionId}>
          <Code2 className="mr-2 h-3.5 w-3.5" /> Open with Code
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem onSelect={propertiesOfFolder}>
          <Info className="mr-2 h-3.5 w-3.5" /> Properties
          <ContextMenuShortcut>Alt+Enter</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuItem disabled>
          <MoreHorizontal className="mr-2 h-3.5 w-3.5" /> Show more options
          <ContextMenuShortcut>Shift+F10</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

// =====================================================================
//  helpers
// =====================================================================

async function newFileWith(
  sessionId: string | null,
  currentPath: string,
  qc: ReturnType<typeof useQueryClient>,
  defaultName: string,
  content: string,
) {
  if (!sessionId) return;
  const name = window.prompt("File name:", defaultName);
  if (!name) return;
  const trimmed = name.trim();
  if (!trimmed || trimmed.includes("/")) {
    toast.error("Invalid name");
    return;
  }
  const dest = joinPath(currentPath, trimmed);
  try {
    await api(endpoints.ssh.writeFile, {
      method: "POST",
      json: { session_id: sessionId, path: dest, content },
    });
    toast.success(`Created ${trimmed}`);
    qc.invalidateQueries({ queryKey: ["files", sessionId, currentPath] });
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Create failed");
  }
}

function joinPath(dir: string, name: string): string {
  return `${dir.replace(/\/+$/, "")}/${name}`.replace(/\/+/g, "/");
}

function basename(p: string): string {
  const trimmed = p.replace(/\/+$/, "");
  return trimmed.split("/").pop() ?? trimmed;
}

function quoteShell(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

function viewIconFor(mode: ViewMode): React.ReactNode {
  const cls = "mr-2 h-3.5 w-3.5";
  switch (mode) {
    case "large-icons":
      return <LayoutGrid className={cls} />;
    case "medium-icons":
      return <Squircle className={cls} />;
    case "small-icons":
      return <Rows3 className={cls} />;
    case "list":
      return <ListIcon className={cls} />;
    case "details":
      return <LayoutList className={cls} />;
    default:
      return <Type className={cls} />;
  }
}
