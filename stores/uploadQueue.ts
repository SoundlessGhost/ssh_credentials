// Upload queue (Zustand). Lives across navigation so uploads survive route
// changes. Step 10 wires the tus-js-client into this queue with concurrency 3.

import { create } from "zustand";

export type UploadStatus =
  | "queued"
  | "uploading"
  | "sftp"
  | "done"
  | "error"
  | "paused"
  | "cancelled";

export type UploadItem = {
  id: string;
  file: File;
  targetPath: string;
  sessionId: string;
  bytesUploaded: number;
  totalBytes: number;
  status: UploadStatus;
  error?: string;
  // Filled in once tus assigns a transfer id (the tus upload UID).
  transferId?: string;
};

type UploadQueueState = {
  items: Record<string, UploadItem>;
  order: string[];
  add: (item: UploadItem) => void;
  update: (id: string, patch: Partial<UploadItem>) => void;
  remove: (id: string) => void;
  clearDone: () => void;
};

export const useUploadQueue = create<UploadQueueState>((set) => ({
  items: {},
  order: [],
  add: (item) =>
    set((s) => ({
      items: { ...s.items, [item.id]: item },
      order: s.order.includes(item.id) ? s.order : [...s.order, item.id],
    })),
  update: (id, patch) =>
    set((s) =>
      s.items[id]
        ? { items: { ...s.items, [id]: { ...s.items[id], ...patch } } }
        : s,
    ),
  remove: (id) =>
    set((s) => {
      const next = { ...s.items };
      delete next[id];
      return { items: next, order: s.order.filter((x) => x !== id) };
    }),
  clearDone: () =>
    set((s) => {
      const keepIds = s.order.filter(
        (id) =>
          s.items[id] &&
          s.items[id].status !== "done" &&
          s.items[id].status !== "cancelled",
      );
      const nextItems: Record<string, UploadItem> = {};
      for (const id of keepIds) nextItems[id] = s.items[id];
      return { items: nextItems, order: keepIds };
    }),
}));
