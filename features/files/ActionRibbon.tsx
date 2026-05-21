"use client";

import React from "react";
import {
  Archive,
  Copy,
  Download,
  FolderPlus,
  Pencil,
  Scissors,
  Trash2,
  Upload,
  ClipboardPaste,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { useConnection } from "@/stores/connection";
import { useFiles } from "@/hooks/useFiles";
import { useFileActions } from "@/features/files/useFileActions";
import { useFileDialogs } from "@/stores/fileDialogs";

type Props = {
  onUploadClick?: () => void;
};

export function ActionRibbon({ onUploadClick }: Props) {
  const sessionId = useConnection((s) => s.sessionId);
  const currentPath = useConnection((s) => s.currentPath);
  const { data } = useFiles(sessionId, currentPath);
  const items = data?.items ?? [];
  const actions = useFileActions(items);
  const openNewItem = useFileDialogs((s) => s.openNewItem);

  const disabled = !sessionId;

  const newFolder = () =>
    openNewItem({
      kind: "folder",
      label: "Folder",
      defaultName: "New folder",
      content: "",
    });

  return (
    <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b bg-card px-2 py-1 [&::-webkit-scrollbar]:h-1">
      <Button
        size="sm"
        variant="ghost"
        disabled={disabled}
        onClick={newFolder}
        className="h-7 gap-1.5 px-2 text-xs"
      >
        <FolderPlus className="h-3.5 w-3.5" /> New Folder
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={disabled}
        onClick={onUploadClick}
        className="h-7 gap-1.5 px-2 text-xs"
      >
        <Upload className="h-3.5 w-3.5" /> Upload
      </Button>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <Button
        size="sm"
        variant="ghost"
        disabled={disabled || !actions.isSingle}
        onClick={actions.download}
        className="h-7 gap-1.5 px-2 text-xs"
      >
        <Download className="h-3.5 w-3.5" /> Download
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={disabled || !actions.hasSelection}
        onClick={actions.cut}
        className="h-7 gap-1.5 px-2 text-xs"
      >
        <Scissors className="h-3.5 w-3.5" /> Cut
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={disabled || !actions.hasSelection}
        onClick={actions.copy}
        className="h-7 gap-1.5 px-2 text-xs"
      >
        <Copy className="h-3.5 w-3.5" /> Copy
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={disabled || !actions.hasClipboard}
        onClick={actions.paste}
        className="h-7 gap-1.5 px-2 text-xs"
      >
        <ClipboardPaste className="h-3.5 w-3.5" /> Paste
        {actions.hasClipboard && (
          <span className="text-[9px] text-muted-foreground">
            ({actions.clipboardMode})
          </span>
        )}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={disabled || !actions.isSingle}
        onClick={actions.triggerRename}
        className="h-7 gap-1.5 px-2 text-xs"
      >
        <Pencil className="h-3.5 w-3.5" /> Rename
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={disabled || !actions.hasSelection}
        onClick={() => actions.triggerCompress()}
        className="h-7 gap-1.5 px-2 text-xs"
      >
        <Archive className="h-3.5 w-3.5" /> Compress
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={disabled || !actions.hasSelection}
        onClick={() => actions.triggerDelete()}
        className="h-7 gap-1.5 px-2 text-xs text-destructive hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </Button>

      {actions.hasSelection && (
        <span className="ml-auto pr-2 text-[10px] text-muted-foreground">
          {actions.selectedItems.length} selected
        </span>
      )}
    </div>
  );
}
