"use client";

import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { useConnection } from "@/stores/connection";
import { useFiles } from "@/hooks/useFiles";
import { AppShell } from "@/components/AppShell";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ServerSidebar } from "@/features/servers/ServerSidebar";
import { FileList } from "@/features/files/FileList";
import { ActionRibbon } from "@/features/files/ActionRibbon";
import { RenameDialog } from "@/features/files/RenameDialog";
import { DeleteConfirm } from "@/features/files/DeleteConfirm";
import { CompressDialog } from "@/features/files/CompressDialog";
import { EditorDialog } from "@/features/files/EditorDialog";
import { PropertiesDialog } from "@/features/files/PropertiesDialog";
import { useFileActions } from "@/features/files/useFileActions";
import { UploadTray } from "@/features/upload/UploadTray";
import {
  setUploadQueryClient,
  uploadManager,
} from "@/features/upload/uploadManager";
import { Terminal } from "@/features/terminal/Terminal";
import { HostKeyConfirmDialog } from "@/features/connection/HostKeyConfirmDialog";
import { MonitorDialog } from "@/features/monitor/MonitorDialog";

function FileDialogsMount() {
  const sessionId = useConnection((s) => s.sessionId);
  const currentPath = useConnection((s) => s.currentPath);
  const { data } = useFiles(sessionId, currentPath);
  const items = useMemo(() => data?.items ?? [], [data]);
  const actions = useFileActions(items);

  return (
    <>
      <RenameDialog onRename={actions.performRename} />
      <DeleteConfirm onDelete={actions.performDelete} />
      <CompressDialog onCompress={actions.performCompress} />
      <EditorDialog />
      <PropertiesDialog />
    </>
  );
}

function FeatureErrorFallback({ name }: { name: string }) {
  return (
    <div className="flex h-full items-center justify-center p-4 text-xs text-muted-foreground">
      {name} crashed. Reload the page to recover.
    </div>
  );
}

export default function Home() {
  const sessionId = useConnection((s) => s.sessionId);
  const currentPath = useConnection((s) => s.currentPath);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  // Let the upload manager (outside React) invalidate the file list query
  // the moment a tus upload completes — no need to wait for SFTP polling.
  useEffect(() => {
    setUploadQueryClient(qc);
  }, [qc]);

  const handleFiles = (files: File[]) => {
    if (!sessionId) {
      toast.error("Connect to a server first");
      return;
    }
    uploadManager.addFiles(files, sessionId, currentPath);
  };

  const openFilePicker = () => fileInputRef.current?.click();

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          const list = Array.from(e.target.files ?? []);
          if (list.length) handleFiles(list);
          e.target.value = "";
        }}
      />

      <AppShell
        sidebar={
          <ErrorBoundary fallback={<FeatureErrorFallback name="Sidebar" />}>
            <ServerSidebar />
          </ErrorBoundary>
        }
        actionBar={
          <ErrorBoundary
            fallback={<div className="h-8 border-b" />}
          >
            <ActionRibbon onUploadClick={openFilePicker} />
          </ErrorBoundary>
        }
        filePane={
          <ErrorBoundary fallback={<FeatureErrorFallback name="File list" />}>
            <FileList
              onUploadClick={openFilePicker}
              onDropFiles={handleFiles}
            />
          </ErrorBoundary>
        }
        terminal={
          <ErrorBoundary fallback={<FeatureErrorFallback name="Terminal" />}>
            <Terminal />
          </ErrorBoundary>
        }
        uploadTray={
          <ErrorBoundary fallback={<div />}>
            <UploadTray />
          </ErrorBoundary>
        }
      />

      <FileDialogsMount />
      <HostKeyConfirmDialog />
      <MonitorDialog />
    </>
  );
}
