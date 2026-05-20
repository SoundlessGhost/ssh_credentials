"use client";

import React from "react";
import {
  Archive,
  ArchiveRestore,
  ClipboardPaste,
  Copy,
  Download,
  FolderOpen,
  Pencil,
  RefreshCw,
  Scissors,
  Trash2,
  Upload,
} from "lucide-react";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
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
  children: React.ReactNode;
};

/**
 * Wraps a single FileRow. The visible row is the trigger.
 * Right-click → menu items shaped by current selection state.
 */
export function FileContextMenu({
  items,
  rowItem,
  onOpen,
  onUploadClick,
  onRefresh,
  children,
}: Props) {
  const navigate = useConnection((s) => s.navigate);
  const actions = useFileActions(items);

  // Compute whether the right-clicked row is part of the selection. If not,
  // the action ribbon already pre-selected it via the row's onContextMenu —
  // so by the time the menu opens, selection has been corrected.
  const single = actions.selectedItems.length === 1;
  const multi = actions.selectedItems.length > 1;
  const isFolder = rowItem.type === "folder";
  const isArchiveFile = !isFolder && isArchive(rowItem.name);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        {single && (
          <ContextMenuItem onSelect={() => onOpen(rowItem)}>
            <FolderOpen className="mr-2 h-3.5 w-3.5" />
            {isFolder ? "Open" : "Preview"}
          </ContextMenuItem>
        )}
        {isFolder && single && (
          <ContextMenuItem onSelect={() => navigate(rowItem.path)}>
            <FolderOpen className="mr-2 h-3.5 w-3.5" /> Open in new pane
          </ContextMenuItem>
        )}

        {single && !isFolder && (
          <ContextMenuItem onSelect={actions.download}>
            <Download className="mr-2 h-3.5 w-3.5" /> Download
          </ContextMenuItem>
        )}

        <ContextMenuSeparator />

        <ContextMenuItem onSelect={actions.cut}>
          <Scissors className="mr-2 h-3.5 w-3.5" /> Cut
        </ContextMenuItem>
        <ContextMenuItem onSelect={actions.copy}>
          <Copy className="mr-2 h-3.5 w-3.5" /> Copy
        </ContextMenuItem>
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

        {single && (
          <ContextMenuItem onSelect={actions.triggerRename}>
            <Pencil className="mr-2 h-3.5 w-3.5" /> Rename
          </ContextMenuItem>
        )}
        <ContextMenuItem onSelect={() => actions.triggerCompress()}>
          <Archive className="mr-2 h-3.5 w-3.5" /> Compress…
        </ContextMenuItem>
        {isArchiveFile && single && (
          <ContextMenuItem onSelect={() => actions.extract(rowItem)}>
            <ArchiveRestore className="mr-2 h-3.5 w-3.5" /> Extract here
          </ContextMenuItem>
        )}

        <ContextMenuSeparator />

        <ContextMenuItem
          onSelect={() => actions.triggerDelete()}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
          {multi && (
            <span className="ml-auto text-[10px]">
              {actions.selectedItems.length}
            </span>
          )}
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem onSelect={onUploadClick}>
          <Upload className="mr-2 h-3.5 w-3.5" /> Upload here
        </ContextMenuItem>
        <ContextMenuItem onSelect={onRefresh}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" /> Refresh
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

/**
 * Empty-area context menu (right-click outside any row). Smaller set of
 * options since there's no selection.
 */
export function EmptyAreaContextMenu({
  items,
  onUploadClick,
  onRefresh,
  onNewFolder,
  children,
}: {
  items: FileItem[];
  onUploadClick?: () => void;
  onRefresh?: () => void;
  onNewFolder?: () => void;
  children: React.ReactNode;
}) {
  const actions = useFileActions(items);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onSelect={onNewFolder}>
          <FolderOpen className="mr-2 h-3.5 w-3.5" /> New folder
        </ContextMenuItem>
        <ContextMenuItem onSelect={onUploadClick}>
          <Upload className="mr-2 h-3.5 w-3.5" /> Upload
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
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
