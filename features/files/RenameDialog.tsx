"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useFileDialogs } from "@/stores/fileDialogs";
import type { FileItem } from "@/hooks/useFiles";

type Props = {
  onRename: (item: FileItem, newName: string) => Promise<void>;
};

export function RenameDialog({ onRename }: Props) {
  const target = useFileDialogs((s) => s.renameTarget);
  const close = useFileDialogs((s) => s.closeRename);

  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (target) setName(target.name);
  }, [target]);

  if (!target) return null;

  const submit = async () => {
    setSubmitting(true);
    try {
      await onRename(target, name);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Rename</DialogTitle>
          <DialogDescription>
            Current name: <code className="font-mono">{target.name}</code>
          </DialogDescription>
        </DialogHeader>
        <Input
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
        <DialogFooter>
          <Button variant="ghost" onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting || !name.trim()}>
            Rename
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
