"use client";

import React, { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { useConnection } from "@/stores/connection";
import { useFileDialogs } from "@/stores/fileDialogs";
import { formatBytes } from "@/lib/format";

const PREVIEW_BINARY_EXTS = [
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "ico",
  "bmp",
  "pdf",
  "mp3",
  "mp4",
  "mov",
  "avi",
  "mkv",
  "zip",
  "tar",
  "gz",
  "rar",
  "7z",
  "exe",
  "bin",
];

function extOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

function looksBinary(name: string): boolean {
  return PREVIEW_BINARY_EXTS.includes(extOf(name));
}

export function EditorDialog() {
  const sessionId = useConnection((s) => s.sessionId);
  const target = useFileDialogs((s) => s.editorTarget);
  const close = useFileDialogs((s) => s.closeEditor);
  const qc = useQueryClient();

  const [content, setContent] = useState("");
  const [original, setOriginal] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!target || !sessionId) return;
    if (looksBinary(target.name)) {
      setContent("");
      setOriginal("");
      return;
    }
    setError(null);
    setLoading(true);
    api<{ content: string }>(endpoints.ssh.readFile, {
      query: { session_id: sessionId, path: target.path },
    })
      .then((res) => {
        setContent(res.content);
        setOriginal(res.content);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to read file");
      })
      .finally(() => setLoading(false));
  }, [target, sessionId]);

  if (!target) return null;

  const dirty = content !== original;
  const binary = looksBinary(target.name);

  const save = async () => {
    if (!sessionId || !target) return;
    setSaving(true);
    try {
      await api(endpoints.ssh.writeFile, {
        method: "POST",
        json: {
          session_id: sessionId,
          path: target.path,
          content,
        },
      });
      setOriginal(content);
      toast.success(`Saved ${target.name}`);
      qc.invalidateQueries({ queryKey: ["files", sessionId] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (open) return;
    if (dirty) {
      if (!window.confirm("Discard unsaved changes?")) return;
    }
    close();
  };

  return (
    <Dialog open={!!target} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 truncate">
            <span className="truncate font-mono text-sm">{target.path}</span>
            {dirty && (
              <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                modified
              </Badge>
            )}
            <Badge variant="secondary" className="ml-auto h-4 px-1.5 text-[10px]">
              {formatBytes(target.size)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-[300px] flex-1 flex-col overflow-hidden rounded-md border">
          {binary ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
              <AlertCircle className="h-6 w-6" />
              Binary file — editor preview is text-only.
              <span className="text-xs">
                Use Download from the action ribbon instead.
              </span>
            </div>
          ) : loading ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading file…
            </div>
          ) : error ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-destructive">
              <AlertCircle className="h-6 w-6" />
              <div className="text-sm">{error}</div>
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              spellCheck={false}
              className="flex-1 resize-none bg-background p-3 font-mono text-xs leading-relaxed outline-none"
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleClose(false)} disabled={saving}>
            Close
          </Button>
          <Button
            onClick={save}
            disabled={saving || !dirty || binary || loading || !!error}
          >
            {saving ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-3.5 w-3.5" />
            )}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
