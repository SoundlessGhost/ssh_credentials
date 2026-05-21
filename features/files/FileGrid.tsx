"use client";

import React from "react";
import type { FileItem } from "@/hooks/useFiles";
import { FileIcon } from "@/features/files/FileIcon";
import { startFolderDrag } from "@/features/files/folderDrag";

const SIZE_MAP = {
  "small-icons": {
    tile: "w-24",
    iconBox: "h-10 w-10",
    icon: "h-6 w-6",
    text: "text-[10px]",
    grid: "grid-cols-[repeat(auto-fill,minmax(96px,1fr))]",
  },
  "medium-icons": {
    tile: "w-28",
    iconBox: "h-14 w-14",
    icon: "h-8 w-8",
    text: "text-[11px]",
    grid: "grid-cols-[repeat(auto-fill,minmax(112px,1fr))]",
  },
  "large-icons": {
    tile: "w-36",
    iconBox: "h-20 w-20",
    icon: "h-12 w-12",
    text: "text-xs",
    grid: "grid-cols-[repeat(auto-fill,minmax(144px,1fr))]",
  },
} as const;

type Mode = keyof typeof SIZE_MAP;

type Props = {
  items: FileItem[];
  mode: Mode;
  selectedPaths: Set<string>;
  activeIdx: number;
  onItemClick: (idx: number, e: React.MouseEvent) => void;
  onItemDoubleClick: (item: FileItem) => void;
  onItemContextMenu: (idx: number) => void;
  renderRowMenu: (item: FileItem, idx: number, children: React.ReactNode) => React.ReactNode;
};

export function FileGrid({
  items,
  mode,
  selectedPaths,
  activeIdx,
  onItemClick,
  onItemDoubleClick,
  onItemContextMenu,
  renderRowMenu,
}: Props) {
  const sz = SIZE_MAP[mode];
  return (
    <div className={`grid gap-2 p-3 ${sz.grid}`}>
      {items.map((item, idx) => {
        const isSelected = selectedPaths.has(item.path);
        const isActive = activeIdx === idx;
        const isFolder = item.type === "folder";
        const tile = (
          <button
            type="button"
            onClick={(e) => onItemClick(idx, e)}
            onDoubleClick={() => onItemDoubleClick(item)}
            onContextMenu={() => onItemContextMenu(idx)}
            draggable={isFolder}
            onDragStart={(e) => {
              if (isFolder) startFolderDrag(e, item);
            }}
            className={`group flex flex-col items-center gap-1 rounded-md p-2 text-center transition-colors ${
              isSelected ? "bg-primary/15" : "hover:bg-accent/60"
            } ${isActive ? "ring-1 ring-primary/40" : ""}`}
            title={`${item.name}\n${item.sizeStr} · ${item.modified}`}
          >
            <span
              className={`flex ${sz.iconBox} items-center justify-center rounded-md`}
            >
              <FileIcon item={item} className={sz.icon} />
            </span>
            <span className={`line-clamp-2 break-all ${sz.text}`}>
              {item.name}
            </span>
          </button>
        );
        return (
          <React.Fragment key={item.path}>
            {renderRowMenu(item, idx, tile)}
          </React.Fragment>
        );
      })}
    </div>
  );
}
