// File selection state. Shared so the action ribbon and (step 9) context
// menu can read what's selected without lifting state into the page.

import { create } from "zustand";

type FileSelectionState = {
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
  clear: () => void;
};

export const useFileSelection = create<FileSelectionState>((set) => ({
  selected: new Set<string>(),
  setSelected: (selected) => set({ selected }),
  clear: () => set({ selected: new Set<string>() }),
}));
