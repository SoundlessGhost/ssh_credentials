"use client";

import React from "react";
import {
  Archive,
  ArchiveRestore,
  ClipboardCopy,
  ClipboardPaste,
  Copy,
  Download,
  FolderOpen,
  Info,
  Pencil,
  Pin,
  PinOff,
  RefreshCw,
  Scissors,
  Sparkles,
  Terminal as TerminalIcon,
  Trash2,
  Upload,
} from "lucide-react";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
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

/**
 * Empty-area context menu (right-click outside any row).
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

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuItem onSelect={onNewFolder}>
          <FolderOpen className="mr-2 h-3.5 w-3.5" /> New folder
        </ContextMenuItem>
        <ContextMenuItem onSelect={onUploadClick}>
          <Upload className="mr-2 h-3.5 w-3.5" /> Upload
        </ContextMenuItem>
        <ContextMenuItem onSelect={onOpenTerminal}>
          <TerminalIcon className="mr-2 h-3.5 w-3.5" /> Open Terminal
          <ContextMenuShortcut>Ctrl+`</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onSelect={actions.paste}
          disabled={!actions.hasClipboard}
        >
          <ClipboardPaste className="mr-2 h-3.5 w-3.5" /> Paste
          {actions.hasClipboard && (
            <span className="ml-auto text-[10px] text-muted-foreground">
              {actions.clipboardMode}
            </span>
          )}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={onRefresh}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" /> Refresh
          <ContextMenuShortcut>F5</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
