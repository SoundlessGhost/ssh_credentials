"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useFileDialogs } from "@/stores/fileDialogs";
import type { FileItem } from "@/hooks/useFiles";

type Props = {
  onCompress: (targets: FileItem[], destName: string) => Promise<void>;
};

export function CompressDialog({ onCompress }: Props) {
  const targets = useFileDialogs((s) => s.compressTargets);
  const close = useFileDialogs((s) => s.closeCompress);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (targets.length === 0) return;
    if (targets.length === 1) {
      setName(`${targets[0].name}.zip`);
    } else {
      setName("archive.zip");
    }
  }, [targets]);

  const open = targets.length > 0;
  if (!open) return null;

  const submit = async () => {
    setSubmitting(true);
    try {
      await onCompress(targets, name);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Compress {targets.length} item(s)</DialogTitle>
        </DialogHeader>
        <Input
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
        <p className="text-[11px] text-muted-foreground">
          Use a <code>.zip</code> or <code>.tar.gz</code> extension. Falls
          back to tar if zip is not installed on the VPS.
        </p>
        <DialogFooter>
          <Button variant="ghost" onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting || !name.trim()}>
            Create archive
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
