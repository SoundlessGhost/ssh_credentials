"use client";

import React, { useState } from "react";
import {
  Archive,
  Copy,
  Download,
  FolderPlus,
  Loader2,
  Pencil,
  Scissors,
  Trash2,
  Upload,
  ClipboardPaste,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { useConnection } from "@/stores/connection";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { useFiles } from "@/hooks/useFiles";
import { useFileActions } from "@/features/files/useFileActions";

type Props = {
  onUploadClick?: () => void;
};

export function ActionRibbon({ onUploadClick }: Props) {
  const sessionId = useConnection((s) => s.sessionId);
  const currentPath = useConnection((s) => s.currentPath);
  const { data } = useFiles(sessionId, currentPath);
  const items = data?.items ?? [];
  const actions = useFileActions(items);
  const qc = useQueryClient();

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creating, setCreating] = useState(false);

  const disabled = !sessionId;

  const createFolder = async () => {
    if (!sessionId) return;
    const name = newFolderName.trim();
    if (!name) {
      toast.error("Folder name required");
      return;
    }
    setCreating(true);
    try {
      await api(endpoints.ssh.createFolder, {
        method: "POST",
        json: {
          session_id: sessionId,
          path: currentPath,
          folder_name: name,
        },
      });
      toast.success(`Created ${name}`);
      qc.invalidateQueries({ queryKey: ["files", sessionId, currentPath] });
      setNewFolderOpen(false);
      setNewFolderName("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create folder";
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex shrink-0 items-center gap-1 border-b bg-card px-2 py-1">
      <Button
        size="sm"
        variant="ghost"
        disabled={disabled}
        onClick={() => setNewFolderOpen(true)}
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

      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="folder-name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") createFolder();
            }}
            autoFocus
          />
          <p className="text-[11px] text-muted-foreground">
            Created in <code className="font-mono">{currentPath}</code>
          </p>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setNewFolderOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button onClick={createFolder} disabled={creating}>
              {creating && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Exposed via window-message contract is fragile; just export a small
// helper to open the New Folder dialog imperatively from FileList's empty
// area context menu in a future refactor. For now the ribbon owns it.
