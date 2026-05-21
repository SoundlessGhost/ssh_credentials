// UI-only filters: search query + view mode + sort + group. Per-tab state,
// no persistence. Sort/group lifted here so the empty-area context menu can
// drive them without prop-drilling through FileList.

import { create } from "zustand";

export type ViewMode =
  | "details"
  | "list"
  | "small-icons"
  | "medium-icons"
  | "large-icons";

export type SortKey = "name" | "size" | "modified" | "type";
export type SortDir = "asc" | "desc";
export type GroupBy = "none" | "type" | "size" | "modified";

type UiFiltersState = {
  searchQuery: string;
  viewMode: ViewMode;
  sortKey: SortKey;
  sortDir: SortDir;
  groupBy: GroupBy;
  setSearchQuery: (q: string) => void;
  setViewMode: (m: ViewMode) => void;
  setSortKey: (k: SortKey) => void;
  setSortDir: (d: SortDir) => void;
  toggleSort: (k: SortKey) => void;
  setGroupBy: (g: GroupBy) => void;
};

export const useUiFilters = create<UiFiltersState>((set, get) => ({
  searchQuery: "",
  viewMode: "details",
  sortKey: "name",
  sortDir: "asc",
  groupBy: "none",
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setViewMode: (viewMode) => set({ viewMode }),
  setSortKey: (sortKey) => set({ sortKey }),
  setSortDir: (sortDir) => set({ sortDir }),
  toggleSort: (k) => {
    const { sortKey, sortDir } = get();
    if (sortKey === k) set({ sortDir: sortDir === "asc" ? "desc" : "asc" });
    else set({ sortKey: k, sortDir: "asc" });
  },
  setGroupBy: (groupBy) => set({ groupBy }),
}));
