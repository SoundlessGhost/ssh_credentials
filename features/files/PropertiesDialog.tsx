"use client";

import React from "react";
import {
  CalendarClock,
  Copy,
  FileType,
  Fingerprint,
  HardDrive,
  Hash,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { useFileDialogs } from "@/stores/fileDialogs";
import { formatBytes } from "@/lib/format";

export function PropertiesDialog() {
  const target = useFileDialogs((s) => s.propertiesTarget);
  const close = useFileDialogs((s) => s.closeProperties);

  if (!target) return null;

  const ext = (() => {
    if (target.type === "folder") return "Folder";
    const dot = target.name.lastIndexOf(".");
    return dot >= 0 ? target.name.slice(dot + 1).toUpperCase() : "File";
  })();

  const copyPath = async () => {
    try {
      await navigator.clipboard.writeText(target.path);
      toast.success("Path copied");
    } catch {
      toast.error("Clipboard blocked");
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="truncate">{target.name}</DialogTitle>
        </DialogHeader>

        <dl className="space-y-2 text-xs">
          <Row icon={<FileType className="h-3.5 w-3.5" />} label="Type">
            {ext}
          </Row>
          <Row icon={<HardDrive className="h-3.5 w-3.5" />} label="Size">
            {target.type === "folder"
              ? "—"
              : `${formatBytes(target.size)} (${target.size.toLocaleString()} bytes)`}
          </Row>
          <Row icon={<Fingerprint className="h-3.5 w-3.5" />} label="Path">
            <code className="break-all rounded bg-muted px-1 py-0.5 font-mono">
              {target.path}
            </code>
          </Row>
          <Row icon={<CalendarClock className="h-3.5 w-3.5" />} label="Modified">
            {target.modified}
          </Row>
          <Row icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Permissions">
            <code className="rounded bg-muted px-1 py-0.5 font-mono">
              {target.permissions}
            </code>
          </Row>
          <Row icon={<Hash className="h-3.5 w-3.5" />} label="Name">
            <code className="rounded bg-muted px-1 py-0.5 font-mono">
              {target.name}
            </code>
          </Row>
        </dl>

        <DialogFooter>
          <Button variant="outline" onClick={copyPath}>
            <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy path
          </Button>
          <Button onClick={close}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)] items-start gap-3">
      <dt className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}
