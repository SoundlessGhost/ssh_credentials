"use client";

import React from "react";
import { FileIcon } from "@/features/files/FileIcon";
import type { FileItem } from "@/hooks/useFiles";

type Props = {
  item: FileItem;
  selected: boolean;
  active: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
};

export const FileRow = React.memo(function FileRow({
  item,
  selected,
  active,
  onClick,
  onDoubleClick,
  onContextMenu,
}: Props) {
  return (
    <div
      role="row"
      aria-selected={selected}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      className={`grid h-8 cursor-default select-none grid-cols-[28px_minmax(0,1fr)_70px] items-center gap-2 px-3 text-xs md:grid-cols-[28px_minmax(0,1fr)_90px_150px_110px] ${
        selected
          ? "bg-primary/10 text-foreground"
          : "hover:bg-accent/60"
      } ${active ? "ring-1 ring-primary/40 ring-inset" : ""}`}
    >
      <FileIcon item={item} className="h-4 w-4" />
      <span className="truncate" title={item.name}>
        {item.name}
      </span>
      <span className="text-right tabular-nums text-muted-foreground">
        {item.sizeStr}
      </span>
      <span className="hidden truncate text-muted-foreground md:block">
        {item.modified}
      </span>
      <span className="hidden truncate font-mono text-[10px] text-muted-foreground md:block">
        {item.permissions}
      </span>
    </div>
  );
});
