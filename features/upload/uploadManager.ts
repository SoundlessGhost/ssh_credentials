// Module-level singleton coordinating tus uploads against the Zustand queue.
// Keeping the tus.Upload instances and SFTP-poll timers outside React state
// so they survive re-renders and route navigation.

import * as tus from "tus-js-client";

import { env } from "@/lib/env";
import { endpoints } from "@/lib/api/endpoints";
import { useUploadQueue, type UploadItem } from "@/stores/uploadQueue";

const MAX_CONCURRENT = 3;
const CHUNK_SIZE = 5 * 1024 * 1024;
const RETRY_DELAYS = [0, 1000, 3000, 5000, 10000, 20000];
const SFTP_POLL_MS = 400;
const SFTP_POLL_BACKOFF_MS = 1500;

const uploads = new Map<string, tus.Upload>();
const pollTimers = new Map<string, ReturnType<typeof setTimeout>>();

function activeCount(): number {
  const { items, order } = useUploadQueue.getState();
  return order.filter((id) => {
    const s = items[id]?.status;
    return s === "uploading" || s === "sftp";
  }).length;
}

function maybeStartNext(): void {
  const { items, order, update } = useUploadQueue.getState();
  if (activeCount() >= MAX_CONCURRENT) return;
  const nextId = order.find((id) => items[id]?.status === "queued");
  if (!nextId) return;
  const upload = uploads.get(nextId);
  if (!upload) return;
  update(nextId, { status: "uploading" });
  try {
    upload.start();
  } catch {
    update(nextId, { status: "error", error: "Failed to start upload" });
  }
  if (activeCount() < MAX_CONCURRENT) {
    // Run on next tick so the store has a chance to settle.
    setTimeout(maybeStartNext, 0);
  }
}

function pollSftp(itemId: string, transferId: string): void {
  const tick = async () => {
    try {
      const res = await fetch(
        `${env.apiUrl}${endpoints.ssh.transferProgress}?transfer_id=${encodeURIComponent(transferId)}`,
      );
      const data = (await res.json()) as {
        status: string;
        loaded?: number;
        total?: number;
        error?: string;
      };
      const { update } = useUploadQueue.getState();

      if (data.status === "uploading") {
        update(itemId, {
          bytesUploaded: data.loaded ?? 0,
          totalBytes: data.total ?? 0,
        });
        pollTimers.set(itemId, setTimeout(tick, SFTP_POLL_MS));
      } else if (data.status === "done") {
        update(itemId, { status: "done" });
        uploads.delete(itemId);
        pollTimers.delete(itemId);
        maybeStartNext();
      } else if (data.status === "error") {
        update(itemId, {
          status: "error",
          error: data.error ?? "SFTP push failed",
        });
        uploads.delete(itemId);
        pollTimers.delete(itemId);
        maybeStartNext();
      } else if (data.status === "not_found") {
        // Backend already cleaned up after success. Treat as done.
        update(itemId, { status: "done" });
        uploads.delete(itemId);
        pollTimers.delete(itemId);
        maybeStartNext();
      } else {
        pollTimers.set(itemId, setTimeout(tick, SFTP_POLL_MS));
      }
    } catch {
      pollTimers.set(itemId, setTimeout(tick, SFTP_POLL_BACKOFF_MS));
    }
  };
  tick();
}

function buildUpload(item: UploadItem): tus.Upload {
  const id = item.id;
  const file = item.file;
  return new tus.Upload(file, {
    endpoint: `${env.apiUrl}${endpoints.tus}`,
    chunkSize: CHUNK_SIZE,
    retryDelays: RETRY_DELAYS,
    removeFingerprintOnSuccess: true,
    metadata: {
      filename: file.name,
      filetype: file.type || "application/octet-stream",
      session_id: item.sessionId,
      target_path: item.targetPath,
    },
    onError(err) {
      const { update } = useUploadQueue.getState();
      update(id, { status: "error", error: err.message });
      uploads.delete(id);
      maybeStartNext();
    },
    onProgress(bytesUploaded, bytesTotal) {
      const { items, update } = useUploadQueue.getState();
      // Don't overwrite a paused/cancelled status from a late progress event.
      if (
        items[id] &&
        items[id].status !== "paused" &&
        items[id].status !== "cancelled"
      ) {
        update(id, { bytesUploaded, totalBytes: bytesTotal });
      }
    },
    onSuccess() {
      const inst = uploads.get(id);
      const url = inst?.url ?? "";
      const transferId =
        url.split("?")[0].split("/").filter(Boolean).pop() ?? "";
      const { update } = useUploadQueue.getState();
      update(id, {
        status: "sftp",
        transferId,
        bytesUploaded: file.size,
        totalBytes: file.size,
      });
      if (transferId) {
        pollSftp(id, transferId);
      } else {
        update(id, { status: "done" });
        uploads.delete(id);
        maybeStartNext();
      }
    },
  });
}

function newId(): string {
  return `up_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const uploadManager = {
  /** Queue one or more files for upload to a target path on a session. */
  addFiles(files: File[], sessionId: string, targetPath: string): void {
    if (!files.length) return;
    const { add } = useUploadQueue.getState();
    for (const file of files) {
      const id = newId();
      const item: UploadItem = {
        id,
        file,
        targetPath,
        sessionId,
        bytesUploaded: 0,
        totalBytes: file.size,
        status: "queued",
      };
      uploads.set(id, buildUpload(item));
      add(item);
    }
    maybeStartNext();
  },

  pause(id: string): void {
    const upload = uploads.get(id);
    if (!upload) return;
    upload.abort();
    const { update } = useUploadQueue.getState();
    update(id, { status: "paused" });
    maybeStartNext();
  },

  resume(id: string): void {
    const { items, update } = useUploadQueue.getState();
    const item = items[id];
    if (!item || item.status !== "paused") return;
    const upload = uploads.get(id);
    if (!upload) return;
    update(id, { status: "uploading", error: undefined });
    try {
      upload.start();
    } catch {
      update(id, { status: "error", error: "Failed to resume" });
    }
  },

  cancel(id: string): void {
    const upload = uploads.get(id);
    const timer = pollTimers.get(id);
    if (timer) clearTimeout(timer);
    pollTimers.delete(id);
    if (upload) {
      // shouldTerminate=true clears the partial tus upload on the server too.
      try {
        upload.abort(true);
      } catch {
        // ignore
      }
      uploads.delete(id);
    }
    const { update } = useUploadQueue.getState();
    update(id, { status: "cancelled" });
    maybeStartNext();
  },

  retry(id: string): void {
    const { items, update } = useUploadQueue.getState();
    const item = items[id];
    if (!item) return;
    // Old instance is dead; build a fresh one with same metadata.
    uploads.delete(id);
    uploads.set(
      id,
      buildUpload({
        ...item,
        bytesUploaded: 0,
        status: "queued",
      }),
    );
    update(id, { status: "queued", bytesUploaded: 0, error: undefined });
    maybeStartNext();
  },

  remove(id: string): void {
    this.cancel(id);
    useUploadQueue.getState().remove(id);
  },

  clearDone(): void {
    useUploadQueue.getState().clearDone();
  },
};
