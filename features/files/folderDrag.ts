// Shared drag-and-drop payload for "drag folder to Quick Access" pinning.
// Both row + tile drag sources set the same custom MIME; the sidebar drop
// target reads it back to call useQuickAccess.pin().

import type { FileItem } from "@/hooks/useFiles";

export const FOLDER_DRAG_MIME = "application/x-vps-folder";

export type FolderDragPayload = {
  path: string;
  name: string;
};

export function startFolderDrag(
  e: React.DragEvent,
  item: FileItem,
): void {
  if (item.type !== "folder") return;
  const payload: FolderDragPayload = { path: item.path, name: item.name };
  e.dataTransfer.setData(FOLDER_DRAG_MIME, JSON.stringify(payload));
  // Fallback for browsers that only honor text/plain on dragstart sniff.
  e.dataTransfer.setData("text/plain", item.path);
  e.dataTransfer.effectAllowed = "copy";
}

export function readFolderDrag(
  e: React.DragEvent,
): FolderDragPayload | null {
  const raw = e.dataTransfer.getData(FOLDER_DRAG_MIME);
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    if (
      obj &&
      typeof obj.path === "string" &&
      typeof obj.name === "string"
    ) {
      return obj as FolderDragPayload;
    }
  } catch {
    // ignore
  }
  return null;
}

export function hasFolderDrag(e: React.DragEvent): boolean {
  return Array.from(e.dataTransfer.types).includes(FOLDER_DRAG_MIME);
}
