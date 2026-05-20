// UI-only filters: search query + view mode. Per-tab state, no persistence.

import { create } from "zustand";

export type ViewMode = "list" | "grid";

type UiFiltersState = {
  searchQuery: string;
  viewMode: ViewMode;
  setSearchQuery: (q: string) => void;
  setViewMode: (m: ViewMode) => void;
};

export const useUiFilters = create<UiFiltersState>((set) => ({
  searchQuery: "",
  viewMode: "list",
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setViewMode: (viewMode) => set({ viewMode }),
}));
