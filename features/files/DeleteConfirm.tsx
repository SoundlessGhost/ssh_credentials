"use client";

import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useFileDialogs } from "@/stores/fileDialogs";
import type { FileItem } from "@/hooks/useFiles";

type Props = {
  onDelete: (items: FileItem[]) => Promise<void>;
};

export function DeleteConfirm({ onDelete }: Props) {
  const targets = useFileDialogs((s) => s.deleteTargets);
  const close = useFileDialogs((s) => s.closeDelete);
  const [submitting, setSubmitting] = useState(false);

  const open = targets.length > 0;
  if (!open) return null;

  const summary =
    targets.length === 1
      ? targets[0].name
      : `${targets.length} items`;

  const onConfirm = async () => {
    setSubmitting(true);
    try {
      await onDelete(targets);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && close()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {summary}?</AlertDialogTitle>
          <AlertDialogDescription>
            This is permanent. Files and folders will be removed from the
            remote VPS and cannot be recovered from this UI.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={submitting}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
