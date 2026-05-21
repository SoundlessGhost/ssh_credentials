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
  Copy,
  Download,
  Eye,
  FileCode,
  FileText,
  FolderOpen,
  FolderPlus,
  Group,
  Info,
  LayoutGrid,
  LayoutList,
  Link as LinkIcon,
  List as ListIcon,
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
import { useFileDialogs, type NewItemRequest } from "@/stores/fileDialogs";

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
  const openNewItem = useFileDialogs((s) => s.openNewItem);

  // Spawn the unified New-item dialog with the requested template.
  const newFile = (req: NewItemRequest) => openNewItem(req);

  // Right-clicking the empty area then choosing "Open in Terminal" should
  // behave like the same item on a folder row — i.e. send `cd <current>`.
  // The shortcut Ctrl+` still toggles the panel without a `cd`.
  const openTerminalHere = () => {
    if (sessionId && currentPath) {
      enqueueTerminal(`cd ${quoteShell(currentPath)}\n`);
    }
    onOpenTerminal?.();
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
            <ContextMenuItem
              onSelect={() =>
                newFile({
                  kind: "file",
                  label: "shortcut",
                  defaultName: "Shortcut.lnk",
                  content: "",
                })
              }
            >
              <LinkIcon className="mr-2 h-3.5 w-3.5" /> Shortcut
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              onSelect={() =>
                newFile({
                  kind: "file",
                  label: "Text Document",
                  defaultName: "New Text Document.txt",
                  content: "",
                })
              }
            >
              <FileText className="mr-2 h-3.5 w-3.5" /> Text Document
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={() =>
                newFile({
                  kind: "file",
                  label: "Markdown Document",
                  defaultName: "New Document.md",
                  content: "",
                })
              }
            >
              <FileText className="mr-2 h-3.5 w-3.5" /> Markdown Document
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={() =>
                newFile({
                  kind: "file",
                  label: "Shell script",
                  defaultName: "script.sh",
                  content: "#!/usr/bin/env bash\n",
                })
              }
            >
              <FileCode className="mr-2 h-3.5 w-3.5" /> Shell script (.sh)
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={() =>
                newFile({
                  kind: "file",
                  label: "Python file",
                  defaultName: "Untitled.py",
                  content: "",
                })
              }
            >
              <FileText className="mr-2 h-3.5 w-3.5" /> Python file (.py)
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={() =>
                newFile({
                  kind: "file",
                  label: "JSON file",
                  defaultName: "Untitled.json",
                  content: "{}\n",
                })
              }
            >
              <FileText className="mr-2 h-3.5 w-3.5" /> JSON file
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={() =>
                newFile({
                  kind: "file",
                  label: ".env file",
                  defaultName: ".env",
                  content: "",
                })
              }
            >
              <FileText className="mr-2 h-3.5 w-3.5" /> .env file
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuItem onSelect={onUploadClick}>
          <Upload className="mr-2 h-3.5 w-3.5" /> Upload
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem onSelect={openTerminalHere}>
          <TerminalIcon className="mr-2 h-3.5 w-3.5" /> Open in Terminal
          <ContextMenuShortcut>Ctrl+`</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem onSelect={propertiesOfFolder}>
          <Info className="mr-2 h-3.5 w-3.5" /> Properties
          <ContextMenuShortcut>Alt+Enter</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

// =====================================================================
//  helpers
// =====================================================================

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
