// UI state for file ops that need a dialog (rename, delete, compress,
// new-item). Mounted once at page level; opened by either the action
// ribbon or the right-click context menu.

import { create } from "zustand";
import type { FileItem } from "@/hooks/useFiles";

export type NewItemRequest = {
  kind: "folder" | "file";
  label: string; // dialog title, e.g. "Text Document"
  defaultName: string;
  content: string; // initial file content; ignored for folders
};

type FileDialogsState = {
  renameTarget: FileItem | null;
  deleteTargets: FileItem[];
  compressTargets: FileItem[];
  editorTarget: FileItem | null;
  propertiesTarget: FileItem | null;
  newItem: NewItemRequest | null;

  openRename: (item: FileItem) => void;
  closeRename: () => void;

  openDelete: (items: FileItem[]) => void;
  closeDelete: () => void;

  openCompress: (items: FileItem[]) => void;
  closeCompress: () => void;

  openEditor: (item: FileItem) => void;
  closeEditor: () => void;

  openProperties: (item: FileItem) => void;
  closeProperties: () => void;

  openNewItem: (req: NewItemRequest) => void;
  closeNewItem: () => void;
};

export const useFileDialogs = create<FileDialogsState>((set) => ({
  renameTarget: null,
  deleteTargets: [],
  compressTargets: [],

  openRename: (renameTarget) => set({ renameTarget }),
  closeRename: () => set({ renameTarget: null }),

  openDelete: (deleteTargets) => set({ deleteTargets }),
  closeDelete: () => set({ deleteTargets: [] }),

  openCompress: (compressTargets) => set({ compressTargets }),
  closeCompress: () => set({ compressTargets: [] }),

  editorTarget: null,
  openEditor: (editorTarget) => set({ editorTarget }),
  closeEditor: () => set({ editorTarget: null }),

  propertiesTarget: null,
  openProperties: (propertiesTarget) => set({ propertiesTarget }),
  closeProperties: () => set({ propertiesTarget: null }),

  newItem: null,
  openNewItem: (newItem) => set({ newItem }),
  closeNewItem: () => set({ newItem: null }),
}));
