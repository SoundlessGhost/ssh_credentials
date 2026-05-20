// File clipboard — cut/copy/paste between folders.
// Phase 2 only stores absolute paths from a single server; cross-server
// paste lands later if we ever need it.

import { create } from "zustand";

export type ClipboardMode = "cut" | "copy";

export type ClipboardState = {
  paths: string[];
  mode: ClipboardMode | null;
  sourcePath: string | null;
  set: (paths: string[], mode: ClipboardMode, sourcePath: string) => void;
  clear: () => void;
};

export const useClipboard = create<ClipboardState>((set) => ({
  paths: [],
  mode: null,
  sourcePath: null,
  set: (paths, mode, sourcePath) => set({ paths, mode, sourcePath }),
  clear: () => set({ paths: [], mode: null, sourcePath: null }),
}));
