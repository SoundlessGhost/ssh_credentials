"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AlertCircle, FolderOpen, Loader2, Server } from "lucide-react";
import { toast } from "sonner";

import { useFiles, type FileItem } from "@/hooks/useFiles";
import { useConnection } from "@/stores/connection";
import { useFileSelection } from "@/stores/fileSelection";
import { useUiFilters } from "@/stores/uiFilters";
import { useFileDialogs } from "@/stores/fileDialogs";
import { useTerminalUi } from "@/stores/terminalUi";
import { FileRow } from "@/features/files/FileRow";
import { FileGrid } from "@/features/files/FileGrid";
import {
  EmptyAreaContextMenu,
  FileContextMenu,
} from "@/features/files/FileContextMenu";
import { useFileActions } from "@/features/files/useFileActions";
import { useQueryClient } from "@tanstack/react-query";

const ROW_HEIGHT = 32;

type SortKey = "name" | "size" | "modified";

type Props = {
  // Drop handler set in step 10 — for now we surface dropped files to the
  // parent (which doesn't yet wire them to the upload queue).
  onDropFiles?: (files: File[]) => void;
  onUploadClick?: () => void;
  onNewFolderClick?: () => void;
};

export function FileList({
  onDropFiles,
  onUploadClick,
  onNewFolderClick,
}: Props) {
  const sessionId = useConnection((s) => s.sessionId);
  const currentPath = useConnection((s) => s.currentPath);
  const navigate = useConnection((s) => s.navigate);
  const goUp = useConnection((s) => s.goUp);
  const searchQuery = useUiFilters((s) => s.searchQuery);
  const viewMode = useUiFilters((s) => s.viewMode);
  const selected = useFileSelection((s) => s.selected);
  const setSelectedStore = useFileSelection((s) => s.setSelected);
  const openEditor = useFileDialogs((s) => s.openEditor);
  const setTerminalOpen = useTerminalUi((s) => s.setOpen);
  const openTerminal = useCallback(() => setTerminalOpen(true), [setTerminalOpen]);
  const isIconMode =
    viewMode === "small-icons" ||
    viewMode === "medium-icons" ||
    viewMode === "large-icons";

  const qc = useQueryClient();
  const refresh = useCallback(() => {
    if (!sessionId) return;
    qc.invalidateQueries({ queryKey: ["files", sessionId, currentPath] });
  }, [qc, sessionId, currentPath]);

  const { data, isLoading, isFetching, error } = useFiles(sessionId, currentPath);
  const items = useMemo<FileItem[]>(() => data?.items ?? [], [data]);
  const actions = useFileActions(items);

  // Sorting (folders first always)
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sortedItems = useMemo(() => {
    const arr = [...items];
    arr.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "size") return (a.size - b.size) * dir;
      if (sortKey === "modified") return a.modified.localeCompare(b.modified) * dir;
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase()) * dir;
    });
    return arr;
  }, [items, sortKey, sortDir]);

  // Apply search filter after sort so column-sort still works inside results
  const sortedItemsForKeyboard = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedItems;
    return sortedItems.filter((i) => i.name.toLowerCase().includes(q));
  }, [sortedItems, searchQuery]);

  // Active row index + anchor for keyboard nav (selection set lives in Zustand)
  const [activeIdx, setActiveIdx] = useState<number>(-1);
  const anchorIdxRef = useRef<number>(-1);

  // Rubber-band (marquee) selection. Tracks pointer-down position and
  // current cursor; while dragging, computes the row-index range overlap
  // and replaces selection. Holding Ctrl/Cmd merges with previous.
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [marquee, setMarquee] = useState<{
    startX: number;
    startY: number;
    curX: number;
    curY: number;
    additive: boolean;
    baseSelection: Set<string>;
  } | null>(null);

  // Local mutator that also pushes into the shared store
  const setSelected = useCallback(
    (s: Set<string>) => {
      setSelectedStore(s);
    },
    [setSelectedStore],
  );

  // Clear selection when path changes
  useEffect(() => {
    setSelected(new Set());
    setActiveIdx(-1);
    anchorIdxRef.current = -1;
  }, [currentPath, setSelected]);

  const handleRowClick = useCallback(
    (idx: number, e: React.MouseEvent) => {
      const item = sortedItemsForKeyboard[idx];
      if (!item) return;

      if (e.shiftKey && anchorIdxRef.current >= 0) {
        const start = Math.min(anchorIdxRef.current, idx);
        const end = Math.max(anchorIdxRef.current, idx);
        const next = new Set<string>();
        for (let i = start; i <= end; i++) next.add(sortedItemsForKeyboard[i].path);
        setSelected(next);
      } else if (e.ctrlKey || e.metaKey) {
        const next = new Set(selected);
        if (next.has(item.path)) next.delete(item.path);
        else next.add(item.path);
        setSelected(next);
        anchorIdxRef.current = idx;
      } else {
        setSelected(new Set([item.path]));
        anchorIdxRef.current = idx;
      }
      setActiveIdx(idx);
    },
    [sortedItemsForKeyboard, selected, setSelected],
  );

  const openItem = useCallback(
    (item: FileItem) => {
      if (item.type === "folder") {
        navigate(item.path);
      } else {
        openEditor(item);
      }
    },
    [navigate, openEditor],
  );

  // ===== Virtualizer =====
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: sortedItemsForKeyboard.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  // ===== Keyboard nav =====
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (sortedItemsForKeyboard.length === 0) return;
      const ctrl = e.ctrlKey || e.metaKey;
      const alt = e.altKey;
      const shift = e.shiftKey;
      const key = e.key;
      const keyLower = key.toLowerCase();

      // ===== File-operation shortcuts (Windows Explorer parity) =====
      if (ctrl && shift && keyLower === "c") {
        e.preventDefault();
        actions.copyPath();
        return;
      }
      if (ctrl && keyLower === "a") {
        e.preventDefault();
        setSelected(new Set(sortedItemsForKeyboard.map((x) => x.path)));
        return;
      }
      if (ctrl && keyLower === "c") {
        e.preventDefault();
        actions.copy();
        return;
      }
      if (ctrl && keyLower === "x") {
        e.preventDefault();
        actions.cut();
        return;
      }
      if (ctrl && keyLower === "v") {
        e.preventDefault();
        if (actions.hasClipboard) actions.paste();
        return;
      }
      if (key === "F2" && actions.isSingle) {
        e.preventDefault();
        actions.triggerRename();
        return;
      }
      if (key === "Delete" && actions.hasSelection) {
        e.preventDefault();
        actions.triggerDelete();
        return;
      }
      if (alt && key === "Enter" && actions.isSingle) {
        e.preventDefault();
        actions.triggerProperties();
        return;
      }
      if (key === "F5") {
        e.preventDefault();
        refresh();
        return;
      }

      if (key === "Escape") {
        setSelected(new Set());
        setActiveIdx(-1);
        return;
      }

      if (key === "Backspace") {
        e.preventDefault();
        goUp();
        return;
      }

      if (key === "Enter") {
        if (activeIdx >= 0) {
          e.preventDefault();
          openItem(sortedItemsForKeyboard[activeIdx]);
        }
        return;
      }

      const moveTo = (idx: number) => {
        const clamped = Math.max(0, Math.min(sortedItemsForKeyboard.length - 1, idx));
        setActiveIdx(clamped);
        if (e.shiftKey && anchorIdxRef.current >= 0) {
          const start = Math.min(anchorIdxRef.current, clamped);
          const end = Math.max(anchorIdxRef.current, clamped);
          const next = new Set<string>();
          for (let i = start; i <= end; i++) next.add(sortedItemsForKeyboard[i].path);
          setSelected(next);
        } else {
          setSelected(new Set([sortedItemsForKeyboard[clamped].path]));
          anchorIdxRef.current = clamped;
        }
        virtualizer.scrollToIndex(clamped, { align: "auto" });
      };

      if (e.key === "ArrowDown") {
        e.preventDefault();
        moveTo(activeIdx < 0 ? 0 : activeIdx + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        moveTo(activeIdx < 0 ? 0 : activeIdx - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        moveTo(0);
      } else if (e.key === "End") {
        e.preventDefault();
        moveTo(sortedItemsForKeyboard.length - 1);
      }
    },
    [
      sortedItemsForKeyboard,
      activeIdx,
      openItem,
      goUp,
      virtualizer,
      setSelected,
      actions,
      refresh,
    ],
  );

  // ===== Drag & drop =====
  const [dragOver, setDragOver] = useState(false);
  const handleDragOver = (e: React.DragEvent) => {
    if (Array.from(e.dataTransfer.types).includes("Files")) {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(true);
    }
  };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    if (onDropFiles) onDropFiles(files);
    else toast.message(`Dropped ${files.length} file(s) — upload queue lands in step 10`);
  };

  // ===== Render =====
  if (!sessionId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <Server className="h-10 w-10 opacity-30" />
        <div className="text-sm">Connect a server to browse files</div>
        <div className="text-xs">Use the sidebar on the left.</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading {currentPath}</span>
      </div>
    );
  }

  if (error) {
    const message = error instanceof Error ? error.message : "Failed to list files";
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-destructive">
        <AlertCircle className="h-8 w-8" />
        <div className="text-sm">{message}</div>
      </div>
    );
  }

  return (
    <EmptyAreaContextMenu
      items={sortedItemsForKeyboard}
      onUploadClick={onUploadClick}
      onRefresh={refresh}
      onNewFolder={onNewFolderClick}
      onOpenTerminal={openTerminal}
    >
    <div
      className="relative flex h-full flex-col outline-none"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div className="grid shrink-0 grid-cols-[28px_minmax(0,1fr)_70px] items-center gap-2 border-b bg-muted/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:grid-cols-[28px_minmax(0,1fr)_90px_150px_110px]">
        <span />
        <SortHeader
          label="Name"
          active={sortKey === "name"}
          dir={sortDir}
          onClick={() => toggleSort("name", sortKey, sortDir, setSortKey, setSortDir)}
        />
        <SortHeader
          label="Size"
          align="right"
          active={sortKey === "size"}
          dir={sortDir}
          onClick={() => toggleSort("size", sortKey, sortDir, setSortKey, setSortDir)}
        />
        <span className="hidden md:block">
          <SortHeader
            label="Modified"
            active={sortKey === "modified"}
            dir={sortDir}
            onClick={() => toggleSort("modified", sortKey, sortDir, setSortKey, setSortDir)}
          />
        </span>
        <span className="hidden md:block">Permissions</span>
      </div>

      {/* Virtualized rows */}
      <div
        ref={parentRef}
        className="relative flex-1 overflow-auto"
        onMouseDown={(e) => {
          // Rubber-band start only when clicking on the empty scroll area
          // itself (not a row). Left-button only.
          if (e.button !== 0) return;
          if (e.target !== e.currentTarget) {
            // Click on row — let the row handler manage selection.
            return;
          }
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          const additive = e.ctrlKey || e.metaKey || e.shiftKey;
          setMarquee({
            startX: e.clientX - rect.left,
            startY: e.clientY - rect.top + e.currentTarget.scrollTop,
            curX: e.clientX - rect.left,
            curY: e.clientY - rect.top + e.currentTarget.scrollTop,
            additive,
            baseSelection: additive ? new Set(selected) : new Set(),
          });
          if (!additive) {
            setSelected(new Set());
            setActiveIdx(-1);
          }
        }}
        onMouseMove={(e) => {
          if (!marquee) return;
          const el = parentRef.current;
          if (!el) return;
          const rect = el.getBoundingClientRect();
          const curX = e.clientX - rect.left;
          const curY = e.clientY - rect.top + el.scrollTop;
          const top = Math.min(marquee.startY, curY);
          const bottom = Math.max(marquee.startY, curY);
          const startIdx = Math.max(0, Math.floor(top / ROW_HEIGHT));
          const endIdx = Math.min(
            sortedItemsForKeyboard.length - 1,
            Math.floor(bottom / ROW_HEIGHT),
          );
          const next = new Set(marquee.baseSelection);
          for (let i = startIdx; i <= endIdx; i++) {
            const it = sortedItemsForKeyboard[i];
            if (it) next.add(it.path);
          }
          setSelected(next);
          setMarquee({ ...marquee, curX, curY });
        }}
        onMouseUp={() => setMarquee(null)}
        onMouseLeave={() => setMarquee(null)}
      >
        {sortedItems.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
            <FolderOpen className="h-8 w-8 opacity-40" />
            <div className="text-xs">Empty folder</div>
          </div>
        ) : isIconMode ? (
          <FileGrid
            items={sortedItemsForKeyboard}
            mode={viewMode as "small-icons" | "medium-icons" | "large-icons"}
            selectedPaths={selected}
            activeIdx={activeIdx}
            onItemClick={(idx, e) => handleRowClick(idx, e)}
            onItemDoubleClick={(item) => openItem(item)}
            onItemContextMenu={(idx) => {
              const item = sortedItemsForKeyboard[idx];
              if (!item) return;
              if (!selected.has(item.path)) {
                setSelected(new Set([item.path]));
                setActiveIdx(idx);
                anchorIdxRef.current = idx;
              }
            }}
            renderRowMenu={(item, idx, children) => (
              <FileContextMenu
                items={sortedItemsForKeyboard}
                rowItem={item}
                onOpen={openItem}
                onUploadClick={onUploadClick}
                onRefresh={refresh}
                onOpenTerminal={openTerminal}
              >
                <div>{children}</div>
              </FileContextMenu>
            )}
          />
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {/* Marquee rectangle */}
            {marquee && (
              <div
                className="pointer-events-none absolute z-10 border border-primary/60 bg-primary/10"
                style={{
                  left: Math.min(marquee.startX, marquee.curX),
                  top: Math.min(marquee.startY, marquee.curY),
                  width: Math.abs(marquee.curX - marquee.startX),
                  height: Math.abs(marquee.curY - marquee.startY),
                }}
              />
            )}
            {virtualizer.getVirtualItems().map((v) => {
              const item = sortedItemsForKeyboard[v.index];
              return (
                <div
                  key={v.key}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${v.size}px`,
                    transform: `translateY(${v.start}px)`,
                  }}
                >
                  <FileContextMenu
                    items={sortedItemsForKeyboard}
                    rowItem={item}
                    onOpen={openItem}
                    onUploadClick={onUploadClick}
                    onRefresh={refresh}
                    onOpenTerminal={openTerminal}
                  >
                    <div>
                      <FileRow
                        item={item}
                        selected={selected.has(item.path)}
                        active={activeIdx === v.index}
                        onClick={(e) => handleRowClick(v.index, e)}
                        onDoubleClick={() => openItem(item)}
                        onContextMenu={() => {
                          // Pre-select on right-click if not in selection — Windows-style.
                          // Don't preventDefault; let Radix ContextMenu open.
                          if (!selected.has(item.path)) {
                            setSelected(new Set([item.path]));
                            setActiveIdx(v.index);
                            anchorIdxRef.current = v.index;
                          }
                        }}
                      />
                    </div>
                  </FileContextMenu>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="flex h-6 shrink-0 items-center justify-between border-t bg-muted/20 px-3 text-[10px] text-muted-foreground">
        <span>
          {sortedItemsForKeyboard.length} item
          {sortedItemsForKeyboard.length === 1 ? "" : "s"}
          {sortedItems.length !== sortedItemsForKeyboard.length &&
            ` of ${sortedItems.length}`}
          {selected.size > 0 && ` · ${selected.size} selected`}
          {isFetching && (
            <Loader2 className="ml-1.5 inline h-3 w-3 animate-spin" />
          )}
        </span>
        <span className="truncate">{currentPath}</span>
      </div>

      {/* Drag overlay */}
      {dragOver && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-primary/5 ring-2 ring-inset ring-primary/40">
          <div className="rounded-lg border-2 border-dashed border-primary/50 bg-background px-6 py-4 text-sm shadow-lg">
            Drop to upload to <span className="font-mono">{currentPath}</span>
          </div>
        </div>
      )}
    </div>
    </EmptyAreaContextMenu>
  );
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
  align,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
  align?: "left" | "right";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 ${align === "right" ? "justify-end" : ""} hover:text-foreground`}
    >
      {label}
      {active && <span className="text-[8px]">{dir === "asc" ? "▲" : "▼"}</span>}
    </button>
  );
}

function toggleSort(
  next: SortKey,
  current: SortKey,
  currentDir: "asc" | "desc",
  setKey: (k: SortKey) => void,
  setDir: (d: "asc" | "desc") => void,
) {
  if (current === next) setDir(currentDir === "asc" ? "desc" : "asc");
  else {
    setKey(next);
    setDir("asc");
  }
}
